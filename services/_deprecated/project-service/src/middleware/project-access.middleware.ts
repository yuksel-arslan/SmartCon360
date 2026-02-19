import { Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'
import { AppError } from '../errors/app-error'

const prisma = new PrismaClient()

export async function requireProjectAccess(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const projectId = typeof req.params.projectId === 'string' ? req.params.projectId : undefined
    const userId = (req as Request & { user?: { id: string } }).user?.id

    if (!userId) throw new AppError('Unauthorized', 401, 'AUTH_REQUIRED')
    if (!projectId) throw new AppError('Project ID required', 400, 'PROJECT_ID_REQUIRED')

    const member = await prisma.projectMember.findFirst({
      where: { projectId: projectId as string, userId: userId as string, status: 'active' },
    })

    const project = await prisma.project.findFirst({
      where: { id: projectId as string, ownerId: userId as string },
    })

    if (!member && !project) {
      throw new AppError('Project access denied', 403, 'PROJECT_ACCESS_DENIED')
    }

    next()
  } catch (err) {
    next(err)
  }
}
