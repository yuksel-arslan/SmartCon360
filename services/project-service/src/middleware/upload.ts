import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

const ALLOWED_DRAWING_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/acad': ['.dwg'],
  'application/x-autocad': ['.dwg'],
  'application/dxf': ['.dxf'],
  'application/x-dxf': ['.dxf'],
  'image/vnd.dxf': ['.dxf'],
  'application/octet-stream': ['.dwg', '.dxf', '.rvt', '.ifc'],
};

const ALLOWED_EXTENSIONS = ['.pdf', '.dwg', '.dxf', '.rvt', '.ifc'];

const BOQ_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

const drawingStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

function drawingFileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`));
  }
}

function boqFileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (BOQ_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${ext}. Allowed: ${BOQ_EXTENSIONS.join(', ')}`));
  }
}

export const uploadDrawings = multer({
  storage: drawingStorage,
  fileFilter: drawingFileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB per file
    files: 50,
  },
});

export const uploadBoq = multer({
  storage: drawingStorage,
  fileFilter: boqFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
    files: 1,
  },
});

export function getFileType(filename: string): string {
  return path.extname(filename).toLowerCase().replace('.', '');
}
