import type { Readable } from 'stream';

/** Logical store separation — never mix these two. */
export type StoreScope = 'private' | 'public';

export interface StoredFileMeta {
  /** Namespaced object key, e.g. `datasets/ds-batas-kabkot.geojson`. */
  key: string;
  /** Byte size. */
  size: number;
  /** MIME type when known. */
  contentType?: string;
  /** ISO timestamp when available. */
  updatedAt?: string;
  /** Absolute public URL — only present for public-store objects. */
  publicUrl?: string;
}

export interface StorageDriver {
  readonly name: 'local' | 'vercel-blob';
  readonly scope: StoreScope;

  /** True when the object exists and is readable. */
  exists(key: string): Promise<boolean>;

  /** Metadata, or null when the object is absent. */
  getMeta(key: string): Promise<StoredFileMeta | null>;

  /** Full object as a Buffer. */
  read(key: string): Promise<Buffer>;

  /** Full object decoded as UTF-8 text. */
  readText(key: string): Promise<string>;

  /** Node Readable stream for large payloads. */
  createReadStream(key: string): Promise<Readable>;

  /** Upload/overwrite an object. */
  upload(key: string, data: Buffer | string, contentType?: string): Promise<StoredFileMeta>;

  /** Remove an object. */
  remove(key: string): Promise<void>;

  /**
   * Public CDN URL. Returns null for private stores — private objects must be
   * streamed through an authenticated backend route instead.
   */
  getPublicUrl(key: string): string | null;
}

/** Thrown when a requested object does not exist in the store. */
export class StorageObjectNotFoundError extends Error {
  public readonly key: string;
  public readonly scope: StoreScope;

  constructor(key: string, scope: StoreScope) {
    super(`Berkas '${key}' tidak ditemukan pada penyimpanan ${scope}.`);
    this.name = 'StorageObjectNotFoundError';
    this.key = key;
    this.scope = scope;
  }
}

/** Thrown when storage is misconfigured (missing token, bad path…). */
export class StorageConfigurationError extends Error {
  public readonly detail: string;

  constructor(message: string, detail: string) {
    super(message);
    this.name = 'StorageConfigurationError';
    this.detail = detail;
  }
}

/**
 * Normalise an object key.
 *
 * Strips directory traversal, leading slashes and backslashes so that a
 * caller-supplied identifier can never escape its namespace.
 */
export function sanitizeStorageKey(key: string): string {
  const cleaned = String(key || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter((segment) => segment.length > 0 && segment !== '.' && segment !== '..')
    .map((segment) => segment.replace(/[^a-zA-Z0-9._@-]/g, '_'))
    .join('/');

  if (!cleaned) {
    throw new StorageConfigurationError('Kunci penyimpanan tidak valid.', `input=${String(key)}`);
  }
  return cleaned;
}

/** Content type inference for the file kinds this project stores. */
export function inferContentType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.geojson') || lower.endsWith('.json')) return 'application/geo+json';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.kml')) return 'application/vnd.google-earth.kml+xml';
  if (lower.endsWith('.zip')) return 'application/zip';
  if (lower.endsWith('.csv')) return 'text/csv; charset=utf-8';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}
