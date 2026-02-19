import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z, ZodError } from 'zod';
import { uploadDrawings, getFileType } from '../middleware/upload';

const router = Router();

const drawingMetadataSchema = z.object({
  discipline: z.enum(['structural', 'mechanical', 'electrical', 'architectural', 'landscape', 'general']),
  drawingNo: z.string().max(50).optional(),
  title: z.string().max(255).optional(),
  revision: z.string().max(10).optional(),
  sheetSize: z.string().max(10).optional(),
});

export default function drawingRoutes(prisma: PrismaClient) {
  // GET /projects/:id/drawings
  router.get('/projects/:id/drawings', async (req, res) => {
    try {
      const { discipline } = req.query;
      const where: Record<string, unknown> = { projectId: req.params.id };
      if (discipline) where.discipline = discipline;

      const drawings = await prisma.drawing.findMany({
        where,
        orderBy: [{ discipline: 'asc' }, { createdAt: 'desc' }],
      });

      // Group by discipline
      const grouped: Record<string, typeof drawings> = {};
      for (const d of drawings) {
        if (!grouped[d.discipline]) grouped[d.discipline] = [];
        grouped[d.discipline].push(d);
      }

      res.json({ data: drawings, meta: { grouped, total: drawings.length }, error: null });
    } catch (err: any) {
      res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
    }
  });

  // POST /projects/:id/drawings — Upload drawings (multipart)
  router.post('/projects/:id/drawings', uploadDrawings.array('files', 50), async (req, res) => {
    try {
      const projectId = req.params.id as string;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ data: null, error: { code: 'NO_FILES', message: 'No files uploaded' } });
      }

      // Parse metadata — can be a JSON string or individual fields
      let metadata: { discipline: string; drawingNo?: string; title?: string; revision?: string; sheetSize?: string };
      try {
        metadata = drawingMetadataSchema.parse(
          typeof req.body.metadata === 'string' ? JSON.parse(req.body.metadata) : req.body,
        );
      } catch {
        metadata = { discipline: req.body.discipline || 'general' };
      }

      const created = [];
      for (const file of files) {
        const drawing = await prisma.drawing.create({
          data: {
            projectId,
            fileName: file.filename,
            originalName: file.originalname,
            fileType: getFileType(file.originalname),
            fileSize: file.size,
            filePath: file.path,
            discipline: metadata.discipline,
            drawingNo: metadata.drawingNo,
            title: metadata.title || file.originalname.replace(/\.[^.]+$/, ''),
            revision: metadata.revision,
            sheetSize: metadata.sheetSize,
            uploadedBy: (req as any).userId || null,
          },
        });
        created.push(drawing);
      }

      // Update setup drawing count
      await prisma.projectSetup.upsert({
        where: { projectId },
        create: { projectId, drawingCount: created.length },
        update: { drawingCount: { increment: created.length } },
      });

      res.status(201).json({ data: created, meta: { count: created.length }, error: null });
    } catch (err: any) {
      if (err instanceof ZodError) {
        return res.status(400).json({ data: null, error: { code: 'VALIDATION', details: err.errors } });
      }
      res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
    }
  });

  // PATCH /projects/:id/drawings/:drawingId — Update drawing metadata
  router.patch('/projects/:id/drawings/:drawingId', async (req, res) => {
    try {
      const drawing = await prisma.drawing.update({
        where: { id: req.params.drawingId },
        data: req.body,
      });
      res.json({ data: drawing, error: null });
    } catch (err: any) {
      res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
    }
  });

  // DELETE /projects/:id/drawings/:drawingId
  router.delete('/projects/:id/drawings/:drawingId', async (req, res) => {
    try {
      await prisma.drawing.delete({ where: { id: req.params.drawingId } });

      // Update setup drawing count
      await prisma.projectSetup.update({
        where: { projectId: req.params.id },
        data: { drawingCount: { decrement: 1 } },
      }).catch(() => {});

      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
    }
  });

  // GET /projects/:id/drawings/summary — Drawing statistics
  router.get('/projects/:id/drawings/summary', async (req, res) => {
    try {
      const drawings = await prisma.drawing.findMany({
        where: { projectId: req.params.id },
        select: { discipline: true, fileType: true, fileSize: true },
      });

      const byDiscipline: Record<string, number> = {};
      const byType: Record<string, number> = {};
      let totalSize = 0;

      for (const d of drawings) {
        byDiscipline[d.discipline] = (byDiscipline[d.discipline] || 0) + 1;
        byType[d.fileType] = (byType[d.fileType] || 0) + 1;
        totalSize += d.fileSize;
      }

      res.json({
        data: {
          total: drawings.length,
          byDiscipline,
          byType,
          totalSizeBytes: totalSize,
          totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
        },
        error: null,
      });
    } catch (err: any) {
      res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
    }
  });

  return router;
}
