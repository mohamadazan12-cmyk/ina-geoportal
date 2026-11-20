import { Readable } from 'stream';
import {
  S3Client,
  HeadObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import {
  StorageDriver,
  StoredFileMeta,
  StoreScope,
  StorageObjectNotFoundError,
  StorageConfigurationError,
  sanitizeStorageKey,
  inferContentType,
} from './types';
import { toCanonicalKey } from './canonicalKeys';
import { config } from '../../config';

export interface R2DriverOptions {
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucketName?: string;
  endpoint?: string;
  publicUrl?: string;
  client?: S3Client;
  timeoutMs?: number;
  maxRetries?: number;
  /**
   * Whether to prefix object keys with scope ('public/' or 'private/').
   * In Phase 16.4.1 (unified public bucket 'ina-geoportal-data'), set to false
   * so object keys directly follow the canonical schema (e.g. 'datasets/...', 'geojson/web/...').
   * Defaults to true for backwards compatibility with Phase 16.4 dual-store tests.
   */
  useScopePrefix?: boolean;
}

/**
 * Cloudflare R2 / S3-compatible Object Storage Driver.
 *
 * Designed for large geospatial datasets, raster archives, boundary chunks,
 * and regional partitions. Supports single-part and multipart uploads,
 * streaming reads, range queries, and public custom-domain delivery.
 */
export class R2StorageDriver implements StorageDriver {
  public readonly name = 'r2' as const;
  public readonly useScopePrefix: boolean;
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(
    public readonly scope: StoreScope,
    options: R2DriverOptions = {}
  ) {
    this.useScopePrefix = options.useScopePrefix !== undefined ? options.useScopePrefix : true;
    this.bucket = options.bucketName !== undefined ? options.bucketName : (config.r2BucketName || 'ina-geoportal-data');
    const accessKeyId = options.accessKeyId !== undefined ? options.accessKeyId : config.r2AccessKeyId;
    const secretAccessKey = options.secretAccessKey !== undefined ? options.secretAccessKey : config.r2SecretAccessKey;
    const endpoint = options.endpoint !== undefined ? options.endpoint : config.r2Endpoint;
    this.publicBaseUrl = (options.publicUrl || config.r2PublicUrl || 'https://data.inageoportal.go.id').replace(/\/+$/, '');

    if (options.client) {
      this.client = options.client;
      if (!this.bucket) {
        this.bucket = 'ina-geoportal-data';
      }
      return;
    }

    if (!this.bucket || !accessKeyId || !secretAccessKey || !endpoint) {
      throw new StorageConfigurationError(
        `Kredensial Cloudflare R2 untuk penyimpanan ${scope} belum lengkap.`,
        'Pastikan R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, dan R2_ENDPOINT atau R2_ACCOUNT_ID telah dikonfigurasi.'
      );
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      maxAttempts: options.maxRetries || 3,
    });
  }

  /**
   * Namespaced object pathname. In unified public bucket mode (useScopePrefix=false),
   * returns the sanitized canonical key directly without scope prefix.
   */
  public pathname(key: string): string {
    const clean = sanitizeStorageKey(key);
    if (this.useScopePrefix) {
      return `${this.scope}/${clean}`;
    }
    return toCanonicalKey(clean);
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
    const fullKey = this.pathname(key);
    try {
      const res = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: fullKey,
        })
      );

      return {
        key: sanitizeStorageKey(key),
        size: Number(res.ContentLength || 0),
        contentType: res.ContentType || inferContentType(key),
        updatedAt: res.LastModified?.toISOString(),
        publicUrl: this.getPublicUrl(key) || undefined,
      };
    } catch (err: any) {
      if (
        err?.name === 'NotFound' ||
        err?.name === 'NoSuchKey' ||
        err?.$metadata?.httpStatusCode === 404
      ) {
        return null;
      }
      throw err;
    }
  }

  async read(key: string): Promise<Buffer> {
    const fullKey = this.pathname(key);
    try {
      const res = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: fullKey,
        })
      );

      if (!res.Body) {
        throw new StorageObjectNotFoundError(key, this.scope);
      }

      const bytes = await res.Body.transformToByteArray();
      return Buffer.from(bytes);
    } catch (err: any) {
      if (
        err?.name === 'NotFound' ||
        err?.name === 'NoSuchKey' ||
        err?.$metadata?.httpStatusCode === 404
      ) {
        throw new StorageObjectNotFoundError(key, this.scope);
      }
      throw err;
    }
  }

  async readText(key: string): Promise<string> {
    const fullKey = this.pathname(key);
    try {
      const res = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: fullKey,
        })
      );

      if (!res.Body) {
        throw new StorageObjectNotFoundError(key, this.scope);
      }

      return await res.Body.transformToString('utf-8');
    } catch (err: any) {
      if (
        err?.name === 'NotFound' ||
        err?.name === 'NoSuchKey' ||
        err?.$metadata?.httpStatusCode === 404
      ) {
        throw new StorageObjectNotFoundError(key, this.scope);
      }
      throw err;
    }
  }

  async createReadStream(key: string, range?: { start?: number; end?: number }): Promise<Readable> {
    const fullKey = this.pathname(key);
    try {
      const commandInput: any = {
        Bucket: this.bucket,
        Key: fullKey,
      };
      if (range && (range.start !== undefined || range.end !== undefined)) {
        const start = range.start !== undefined ? range.start : '';
        const end = range.end !== undefined ? range.end : '';
        commandInput.Range = `bytes=${start}-${end}`;
      }

      const res = await this.client.send(new GetObjectCommand(commandInput));

      if (!res.Body) {
        throw new StorageObjectNotFoundError(key, this.scope);
      }

      return res.Body as Readable;
    } catch (err: any) {
      if (
        err?.name === 'NotFound' ||
        err?.name === 'NoSuchKey' ||
        err?.$metadata?.httpStatusCode === 404
      ) {
        throw new StorageObjectNotFoundError(key, this.scope);
      }
      throw err;
    }
  }

  async upload(
    key: string,
    data: Buffer | string | Readable,
    contentType?: string
  ): Promise<StoredFileMeta> {
    const fullKey = this.pathname(key);
    const mime = contentType || inferContentType(key);
    const body = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;

    // Use multipart upload via @aws-sdk/lib-storage for large buffers or streams (>5MB)
    const isLarge = Buffer.isBuffer(body) && body.length > 5 * 1024 * 1024;
    const isStream = !(body instanceof Buffer);

    if (isLarge || isStream) {
      const parallelUpload = new Upload({
        client: this.client,
        params: {
          Bucket: this.bucket,
          Key: fullKey,
          Body: body,
          ContentType: mime,
        },
        partSize: 10 * 1024 * 1024, // 10 MiB parts
        queueSize: 4, // 4 concurrent part uploads
      });

      await parallelUpload.done();
    } else {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: fullKey,
          Body: body,
          ContentType: mime,
        })
      );
    }

    const meta = await this.getMeta(key);
    if (!meta) {
      const byteSize = Buffer.isBuffer(body) ? body.length : 0;
      return {
        key: sanitizeStorageKey(key),
        size: byteSize,
        contentType: mime,
        updatedAt: new Date().toISOString(),
        publicUrl: this.getPublicUrl(key) || undefined,
      };
    }
    return meta;
  }

  async remove(key: string): Promise<void> {
    const fullKey = this.pathname(key);
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: fullKey,
      })
    );
  }

  getPublicUrl(key: string): string | null {
    // In Phase 16.4.1 unified public bucket (useScopePrefix=false), all objects are public.
    // In legacy dual-store mode (useScopePrefix=true), private scope returns null.
    if (this.scope === 'private' && this.useScopePrefix) {
      return null;
    }
    const fullKey = this.pathname(key);
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl}/${fullKey}`;
    }
    // If no public CDN URL is configured, return relative public path
    return `/${fullKey}`;
  }
}
