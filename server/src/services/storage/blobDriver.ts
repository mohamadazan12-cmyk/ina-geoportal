import { Readable } from 'stream';
import {
  StorageDriver,
  StoredFileMeta,
  StoreScope,
  StorageObjectNotFoundError,
  StorageConfigurationError,
  sanitizeStorageKey,
  inferContentType,
} from './types';

interface BlobSdk {
  put: (
    pathname: string,
    body: Buffer | string,
    options: Record<string, unknown>
  ) => Promise<{ url: string; pathname: string; contentType?: string; size?: number }>;
  head: (pathname: string) => Promise<{
    url: string;
    pathname: string;
    size: number;
    contentType?: string;
    uploadedAt?: Date | string;
  } | null>;
  del: (pathname: string) => Promise<void>;
  list: (options?: Record<string, unknown>) => Promise<{
    blobs: Array<{ url: string; pathname: string; size: number; uploadedAt?: Date | string }>;
    hasMore: boolean;
  }>;
}

/**
 * Vercel Blob driver.
 *
 * Two independent stores are supported:
 *  - `private` → original documents and dataset downloads. Objects are created
 *    with `access: 'private'` so the CDN never serves them directly; bytes are
 *    streamed by an authenticated Express route.
 *  - `public`  → display-only map layers that Leaflet must fetch anonymously.
 *
 * The SDK is imported lazily so local development never requires the package.
 */
export class VercelBlobStorageDriver implements StorageDriver {
  public readonly name = 'vercel-blob' as const;

  private sdkPromise: Promise<BlobSdk> | null = null;
  private readonly token: string;

  constructor(
    public readonly scope: StoreScope,
    token: string
  ) {
    if (!token) {
      throw new StorageConfigurationError(
        `Token Vercel Blob untuk penyimpanan ${scope} belum dikonfigurasi.`,
        scope === 'private'
          ? 'Set BLOB_READ_WRITE_TOKEN.'
          : 'Set BLOB_PUBLIC_READ_WRITE_TOKEN.'
      );
    }
    this.token = token;
  }

  private async sdk(): Promise<BlobSdk> {
    if (!this.sdkPromise) {
      this.sdkPromise = import('@vercel/blob')
        .then((mod: any) => (mod.put ? mod : mod.default) as BlobSdk)
        .catch((error) => {
          throw new StorageConfigurationError(
            'Paket @vercel/blob tidak tersedia.',
            error instanceof Error ? error.message : String(error)
          );
        });
    }
    return this.sdkPromise;
  }

  /**
   * Blob pathnames are prefixed by scope so the two stores cannot collide even
   * if an operator accidentally points both tokens at one store.
   */
  private pathname(key: string): string {
    return `${this.scope}/${sanitizeStorageKey(key)}`;
  }

  async exists(key: string): Promise<boolean> {
    try {
      const meta = await this.getMeta(key);
      return meta !== null;
    } catch {
      return false;
    }
  }

  async getMeta(key: string): Promise<StoredFileMeta | null> {
    const blob = await this.sdk();
    try {
      const info = await blob.head(this.pathname(key));
      if (!info) return null;
      return {
        key: sanitizeStorageKey(key),
        size: info.size,
        contentType: info.contentType || inferContentType(key),
        updatedAt:
          info.uploadedAt instanceof Date
            ? info.uploadedAt.toISOString()
            : info.uploadedAt || undefined,
        ...(this.scope === 'public' ? { publicUrl: info.url } : {}),
      };
    } catch {
      return null;
    }
  }

  async read(key: string): Promise<Buffer> {
    const url = await this.resolveDownloadUrl(key);
    const response = await fetch(url);
    if (!response.ok) {
      throw new StorageObjectNotFoundError(sanitizeStorageKey(key), this.scope);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  async readText(key: string): Promise<string> {
    const buffer = await this.read(key);
    return buffer.toString('utf-8');
  }

  async createReadStream(key: string): Promise<Readable> {
    // Blob returns an HTTP body; buffer it then expose a Readable so callers
    // keep the same interface as the local driver.
    const buffer = await this.read(key);
    return Readable.from(buffer);
  }

  /**
   * Resolve a fetchable URL for the object.
   *
   * Private objects: the blob URL itself is signed/short-lived and is fetched
   * server-side only — it is never returned to the client.
   */
  private async resolveDownloadUrl(key: string): Promise<string> {
    const blob = await this.sdk();
    const info = await blob.head(this.pathname(key));
    if (!info) {
      throw new StorageObjectNotFoundError(sanitizeStorageKey(key), this.scope);
    }
    return info.url;
  }

  async upload(key: string, data: Buffer | string, contentType?: string): Promise<StoredFileMeta> {
    const blob = await this.sdk();
    const result = await blob.put(this.pathname(key), data, {
      // Every object is private. Display-only map layers reach the browser
      // through the public GeoJSON API route, never through a blob URL, so no
      // object ever needs public access — including the "public" scope, which
      // only namespaces display layers away from original downloads.
      access: 'private',
      contentType: contentType || inferContentType(key),
      token: this.token,
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    return {
      key: sanitizeStorageKey(key),
      size: result.size ?? (typeof data === 'string' ? Buffer.byteLength(data) : data.length),
      contentType: result.contentType || contentType || inferContentType(key),
      updatedAt: new Date().toISOString(),
      ...(this.scope === 'public' ? { publicUrl: result.url } : {}),
    };
  }

  async remove(key: string): Promise<void> {
    const blob = await this.sdk();
    try {
      await blob.del(this.pathname(key));
    } catch {
      // Deleting an absent object is not an error for our callers.
    }
  }

  getPublicUrl(key: string): string | null {
    // Private blobs must never be exposed as a direct URL. Public blobs use a
    // stable pathname-derived URL that callers may cache.
    if (this.scope !== 'public') return null;
    return null; // Resolved asynchronously via getMeta().publicUrl
  }
}
