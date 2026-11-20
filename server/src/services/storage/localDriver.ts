import fs from 'fs';
import path from 'path';
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
import { canonicalToLocalFixture } from './canonicalKeys';

/**
 * Filesystem-backed driver — development and test environments only.
 *
 * Keys are resolved underneath a single root directory. Both the private and
 * public scopes read from the same fixture tree locally, which keeps the
 * developer experience identical to the pre-Phase-14 behaviour.
 */
export class LocalStorageDriver implements StorageDriver {
  public readonly name = 'local' as const;

  constructor(
    public readonly scope: StoreScope,
    private readonly rootDir: string
  ) {}

  private resolve(key: string): string {
    const safeKey = sanitizeStorageKey(key);
    const localRel = canonicalToLocalFixture(safeKey);

    let candidate = path.resolve(this.rootDir, localRel);
    if (!fs.existsSync(candidate)) {
      candidate = path.resolve(this.rootDir, safeKey);
    }
    if (!fs.existsSync(candidate)) {
      const geojsonCandidate = path.resolve(this.rootDir, 'geojson', path.basename(safeKey));
      if (fs.existsSync(geojsonCandidate)) {
        candidate = geojsonCandidate;
      }
    }

    const rootResolved = path.resolve(this.rootDir);

    // Defence in depth: never allow escaping the configured root.
    if (candidate !== rootResolved && !candidate.startsWith(rootResolved + path.sep)) {
      throw new StorageConfigurationError(
        'Upaya akses berkas di luar direktori penyimpanan ditolak.',
        `key=${safeKey}`
      );
    }
    return candidate;
  }

  async exists(key: string): Promise<boolean> {
    try {
      return fs.existsSync(this.resolve(key));
    } catch {
      return false;
    }
  }

  async getMeta(key: string): Promise<StoredFileMeta | null> {
    let absolute: string;
    try {
      absolute = this.resolve(key);
    } catch {
      return null;
    }
    if (!fs.existsSync(absolute)) return null;

    const stat = fs.statSync(absolute);
    if (!stat.isFile()) return null;

    return {
      key: sanitizeStorageKey(key),
      size: stat.size,
      contentType: inferContentType(absolute),
      updatedAt: stat.mtime.toISOString(),
      ...(this.scope === 'public' ? { publicUrl: this.getPublicUrl(key) ?? undefined } : {}),
    };
  }

  async read(key: string): Promise<Buffer> {
    const absolute = this.resolve(key);
    if (!fs.existsSync(absolute)) {
      throw new StorageObjectNotFoundError(sanitizeStorageKey(key), this.scope);
    }
    return fs.promises.readFile(absolute);
  }

  async readText(key: string): Promise<string> {
    const buffer = await this.read(key);
    return buffer.toString('utf-8');
  }

  async createReadStream(key: string, range?: { start?: number; end?: number }): Promise<Readable> {
    const absolute = this.resolve(key);
    if (!fs.existsSync(absolute)) {
      throw new StorageObjectNotFoundError(sanitizeStorageKey(key), this.scope);
    }
    const options: { start?: number; end?: number } = {};
    if (range?.start !== undefined) options.start = range.start;
    if (range?.end !== undefined) options.end = range.end;
    return fs.createReadStream(absolute, options);
  }

  async upload(key: string, data: Buffer | string, contentType?: string): Promise<StoredFileMeta> {
    const absolute = this.resolve(key);
    await fs.promises.mkdir(path.dirname(absolute), { recursive: true });
    await fs.promises.writeFile(absolute, data);

    const stat = await fs.promises.stat(absolute);
    return {
      key: sanitizeStorageKey(key),
      size: stat.size,
      contentType: contentType || inferContentType(absolute),
      updatedAt: stat.mtime.toISOString(),
      ...(this.scope === 'public' ? { publicUrl: this.getPublicUrl(key) ?? undefined } : {}),
    };
  }

  async remove(key: string): Promise<void> {
    const absolute = this.resolve(key);
    if (fs.existsSync(absolute)) {
      await fs.promises.unlink(absolute);
    }
  }

  getPublicUrl(key: string): string | null {
    if (this.scope !== 'public') return null;
    return `/fixtures/${sanitizeStorageKey(key)}`;
  }
}
