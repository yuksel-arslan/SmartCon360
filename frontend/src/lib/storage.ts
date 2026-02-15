import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ── Configuration ──────────────────────────────────────────────────
// Supports AWS S3, Cloudflare R2, MinIO, DigitalOcean Spaces, etc.
// Set STORAGE_PROVIDER=local to fall back to database storage (dev mode)

export type StorageProvider = 'local' | 's3';

interface StorageConfig {
  provider: StorageProvider;
  bucket: string;
  region: string;
  endpoint?: string;       // Custom endpoint for R2, MinIO, etc.
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl?: string;       // Public URL prefix if bucket is public
  forcePathStyle?: boolean; // MinIO needs this
}

function getConfig(): StorageConfig {
  const provider = (process.env.STORAGE_PROVIDER || 'local') as StorageProvider;

  return {
    provider,
    bucket: process.env.STORAGE_BUCKET || '',
    region: process.env.STORAGE_REGION || 'auto',
    endpoint: process.env.STORAGE_ENDPOINT || undefined,
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY || '',
    publicUrl: process.env.STORAGE_PUBLIC_URL || undefined,
    forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === 'true',
  };
}

// Singleton S3 client
let _client: S3Client | null = null;

function getClient(): S3Client {
  if (_client) return _client;

  const cfg = getConfig();
  _client = new S3Client({
    region: cfg.region,
    ...(cfg.endpoint && { endpoint: cfg.endpoint }),
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
    forcePathStyle: cfg.forcePathStyle ?? false,
  });
  return _client;
}

// ── Public API ─────────────────────────────────────────────────────

/** Check if cloud storage is configured */
export function isCloudStorageEnabled(): boolean {
  const cfg = getConfig();
  return cfg.provider === 's3' && !!cfg.bucket && !!cfg.accessKeyId;
}

/** Build the object key for a project file */
export function buildKey(projectId: string, folder: string, fileName: string): string {
  return `projects/${projectId}/${folder}/${fileName}`;
}

/** Upload a buffer to cloud storage */
export async function uploadFile(
  key: string,
  body: Buffer,
  contentType: string,
  metadata?: Record<string, string>,
): Promise<{ url: string; key: string }> {
  const cfg = getConfig();
  const client = getClient();

  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: metadata,
    }),
  );

  const url = cfg.publicUrl
    ? `${cfg.publicUrl.replace(/\/$/, '')}/${key}`
    : `https://${cfg.bucket}.s3.${cfg.region}.amazonaws.com/${key}`;

  return { url, key };
}

/** Get a presigned download URL (valid for given seconds, default 1 hour) */
export async function getDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const cfg = getConfig();
  const client = getClient();

  // If public URL is configured, return it directly
  if (cfg.publicUrl) {
    return `${cfg.publicUrl.replace(/\/$/, '')}/${key}`;
  }

  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: cfg.bucket, Key: key }),
    { expiresIn },
  );
}

/** Stream file from cloud storage (for proxying downloads) */
export async function getFileStream(key: string): Promise<{
  body: ReadableStream | null;
  contentType: string;
  contentLength: number;
}> {
  const cfg = getConfig();
  const client = getClient();

  const response = await client.send(
    new GetObjectCommand({ Bucket: cfg.bucket, Key: key }),
  );

  return {
    body: response.Body?.transformToWebStream() ?? null,
    contentType: response.ContentType || 'application/octet-stream',
    contentLength: response.ContentLength || 0,
  };
}

/** Delete a file from cloud storage */
export async function deleteFile(key: string): Promise<void> {
  const cfg = getConfig();
  const client = getClient();

  await client.send(
    new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }),
  );
}

/** Check if a file exists in cloud storage */
export async function fileExists(key: string): Promise<boolean> {
  const cfg = getConfig();
  const client = getClient();

  try {
    await client.send(
      new HeadObjectCommand({ Bucket: cfg.bucket, Key: key }),
    );
    return true;
  } catch {
    return false;
  }
}

/** Content type mapping for common file types */
export const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  dwg: 'application/acad',
  dxf: 'application/dxf',
  rvt: 'application/octet-stream',
  ifc: 'application/x-step',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  csv: 'text/csv',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};
