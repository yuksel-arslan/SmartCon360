import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

// ── OAuth2 Client Factory ──────────────────────────────────────────

function createOAuth2Client(refreshToken: string) {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('GOOGLE_CLIENT_SECRET is not configured on the server');
  }
  const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
  oauth2.setCredentials({ refresh_token: refreshToken });
  return oauth2;
}

function getDrive(refreshToken: string): drive_v3.Drive {
  return google.drive({ version: 'v3', auth: createOAuth2Client(refreshToken) });
}

// ── Folder Management ──────────────────────────────────────────────

const ROOT_FOLDER_NAME = 'SmartCon360';

/** Find or create a folder by name under a parent */
async function findOrCreateFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId?: string,
): Promise<string> {
  // Search for existing folder
  const query = [
    `name='${name.replace(/'/g, "\\'")}'`,
    "mimeType='application/vnd.google-apps.folder'",
    'trashed=false',
  ];
  if (parentId) query.push(`'${parentId}' in parents`);

  const res = await drive.files.list({
    q: query.join(' and '),
    fields: 'files(id,name)',
    spaces: 'drive',
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  // Create folder
  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId && { parents: [parentId] }),
    },
    fields: 'id',
  });

  return folder.data.id!;
}

/** Get or create the project folder: SmartCon360/{projectName}/{subfolder} */
export async function getProjectFolder(
  refreshToken: string,
  projectName: string,
  subfolder: string,
): Promise<{ drive: drive_v3.Drive; folderId: string }> {
  const drive = getDrive(refreshToken);

  const rootId = await findOrCreateFolder(drive, ROOT_FOLDER_NAME);
  const projectId = await findOrCreateFolder(drive, projectName, rootId);
  const folderId = await findOrCreateFolder(drive, subfolder, projectId);

  return { drive, folderId };
}

// ── File Operations ────────────────────────────────────────────────

/** Upload a file buffer to Google Drive */
export async function uploadToDrive(
  refreshToken: string,
  projectName: string,
  subfolder: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string,
): Promise<{ fileId: string; webViewLink: string }> {
  const { drive, folderId } = await getProjectFolder(refreshToken, projectName, subfolder);

  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id,webViewLink',
  });

  return {
    fileId: res.data.id!,
    webViewLink: res.data.webViewLink || '',
  };
}

/** Download a file from Google Drive as buffer */
export async function downloadFromDrive(
  refreshToken: string,
  fileId: string,
): Promise<Buffer> {
  const drive = getDrive(refreshToken);

  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' },
  );

  return Buffer.from(res.data as ArrayBuffer);
}

/** Get a temporary download URL (webContentLink) */
export async function getDriveDownloadLink(
  refreshToken: string,
  fileId: string,
): Promise<string> {
  const drive = getDrive(refreshToken);

  const res = await drive.files.get({
    fileId,
    fields: 'webContentLink,webViewLink',
  });

  // webContentLink provides a direct download link
  return res.data.webContentLink || res.data.webViewLink || '';
}

/** Delete a file from Google Drive */
export async function deleteFromDrive(
  refreshToken: string,
  fileId: string,
): Promise<void> {
  const drive = getDrive(refreshToken);
  await drive.files.delete({ fileId });
}

/** Check if Drive access is still valid */
export async function isDriveAccessValid(refreshToken: string): Promise<boolean> {
  try {
    const drive = getDrive(refreshToken);
    await drive.about.get({ fields: 'user' });
    return true;
  } catch {
    return false;
  }
}
