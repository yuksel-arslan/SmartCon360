import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ── Configuration ──────────────────────────────────────────────────
// Storage priority: google-drive > s3 > local (database)
// google-drive: uses project owner's Google Drive (per-user credentials)
// s3: platform-managed S3/R2/MinIO bucket
// local: PostgreSQL fileData column (development fallback)

export type StorageProvider = 'local' | 's3' | 'google-drive';

interface StorageConfig {
  provider: StorageProvider;
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl?: string;
  forcePathStyle?: boolean;
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

// ── Storage Provider Detection ─────────────────────────────────────

/** Check if S3-compatible cloud storage is configured */
export function isS3Enabled(): boolean {
  const cfg = getConfig();
  return cfg.provider === 's3' && !!cfg.bucket && !!cfg.accessKeyId;
}

/** Check if Google Drive storage is the preferred provider */
export function isGoogleDrivePreferred(): boolean {
  const cfg = getConfig();
  return cfg.provider === 'google-drive';
}

/** Determine storage provider for a project, given the owner's credentials */
export function resolveStorageProvider(ownerHasDriveToken: boolean): StorageProvider {
  const cfg = getConfig();

  // google-drive: only if configured AND owner has connected their Drive
  if (cfg.provider === 'google-drive' && ownerHasDriveToken) return 'google-drive';

  // s3: if configured with valid credentials
  if (cfg.provider === 's3' && !!cfg.bucket && !!cfg.accessKeyId) return 's3';

  // fallback
  return 'local';
}

// ── S3 Operations ──────────────────────────────────────────────────

/** Build the object key for a project file */
export function buildKey(projectId: string, folder: string, fileName: string): string {
  return `projects/${projectId}/${folder}/${fileName}`;
}

/** Upload a buffer to S3-compatible storage */
export async function uploadFileS3(
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

  if (cfg.publicUrl) {
    return `${cfg.publicUrl.replace(/\/$/, '')}/${key}`;
  }

  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: cfg.bucket, Key: key }),
    { expiresIn },
  );
}

/** Stream file from S3-compatible storage */
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

/** Delete a file from S3-compatible storage */
export async function deleteFileS3(key: string): Promise<void> {
  const cfg = getConfig();
  const client = getClient();

  await client.send(
    new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }),
  );
}

/** Check if a file exists in S3-compatible storage */
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

// ── Content type mapping ───────────────────────────────────────────

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
