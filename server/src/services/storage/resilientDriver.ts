import { Readable } from 'stream';
import { StorageDriver, StoredFileMeta, StoreScope } from './types';
import { R2StorageDriver } from './r2Driver';
import { LocalStorageDriver } from './localDriver';

/**
 * PHASE 16.7 — RESILIENT R2 STORAGE DRIVER WITH TRANSPARENT LOCAL FALLBACK
 *
 * Prioritizes remote Cloudflare R2 bucket (`ina-geoportal-data`). If network
 * drops, connection times out, or R2 credentials fail, seamlessly falls back
 * to local disk fixtures without interrupting user requests.
 */
export class ResilientR2StorageDriver implements StorageDriver {
  public readonly name = 'r2' as const;
  public activeSource: 'r2' | 'local-fallback' = 'r2';
  public lastError: string | null = null;

  constructor(
    public readonly scope: StoreScope,
    public readonly primary: R2StorageDriver,
    public readonly fallback: LocalStorageDriver
  ) {}

  public getActiveSource(): 'r2' | 'local-fallback' {
    return this.activeSource;
  }

  async exists(key: string): Promise<boolean> {
    try {
      const res = await this.primary.exists(key);
      if (res) {
        this.activeSource = 'r2';
        return true;
      }
      const fb = await this.fallback.exists(key);
      if (fb) {
        this.activeSource = 'local-fallback';
        return true;
      }
      return false;
    } catch (err: any) {
      this.activeSource = 'local-fallback';
      this.lastError = err?.message || String(err);
      console.warn(`[STORAGE_RESILIENCE] R2 exists("${key}") failed: ${this.lastError}. Falling back to local.`);
      return this.fallback.exists(key);
    }
  }

  async getMeta(key: string): Promise<StoredFileMeta | null> {
    try {
      const meta = await this.primary.getMeta(key);
      if (meta !== null) {
        this.activeSource = 'r2';
        return meta;
      }
      // If primary returned null, also check fallback before returning null
      const fbMeta = await this.fallback.getMeta(key);
      if (fbMeta !== null) {
        this.activeSource = 'local-fallback';
        return fbMeta;
      }
      return null;
    } catch (err: any) {
      this.activeSource = 'local-fallback';
      this.lastError = err?.message || String(err);
      console.warn(`[STORAGE_RESILIENCE] R2 getMeta("${key}") failed: ${this.lastError}. Falling back to local.`);
      return this.fallback.getMeta(key);
    }
  }

  async read(key: string): Promise<Buffer> {
    try {
      if (await this.primary.exists(key)) {
        const buf = await this.primary.read(key);
        this.activeSource = 'r2';
        return buf;
      }
      const buf = await this.fallback.read(key);
      this.activeSource = 'local-fallback';
      return buf;
    } catch (err: any) {
      this.activeSource = 'local-fallback';
      this.lastError = err?.message || String(err);
      console.warn(`[STORAGE_RESILIENCE] R2 read("${key}") failed: ${this.lastError}. Falling back to local.`);
      return this.fallback.read(key);
    }
  }

  async readText(key: string): Promise<string> {
    try {
      if (await this.primary.exists(key)) {
        const text = await this.primary.readText(key);
        this.activeSource = 'r2';
        return text;
      }
      const text = await this.fallback.readText(key);
      this.activeSource = 'local-fallback';
      return text;
    } catch (err: any) {
      this.activeSource = 'local-fallback';
      this.lastError = err?.message || String(err);
      console.warn(`[STORAGE_RESILIENCE] R2 readText("${key}") failed: ${this.lastError}. Falling back to local.`);
      return this.fallback.readText(key);
    }
  }

  async createReadStream(key: string, range?: { start?: number; end?: number }): Promise<Readable> {
    try {
      if (await this.primary.exists(key)) {
        const stream = await this.primary.createReadStream(key, range);
        this.activeSource = 'r2';
        return stream;
      }
      const stream = await this.fallback.createReadStream(key, range);
      this.activeSource = 'local-fallback';
      return stream;
    } catch (err: any) {
      this.activeSource = 'local-fallback';
      this.lastError = err?.message || String(err);
      console.warn(`[STORAGE_RESILIENCE] R2 createReadStream("${key}") failed: ${this.lastError}. Falling back to local.`);
      return this.fallback.createReadStream(key, range);
    }
  }

  async upload(key: string, data: Buffer | string | Readable, contentType?: string): Promise<StoredFileMeta> {
    return this.primary.upload(key, data, contentType);
  }

  async remove(key: string): Promise<void> {
    return this.primary.remove(key);
  }

  getPublicUrl(key: string): string | null {
    return this.primary.getPublicUrl(key);
  }
}
