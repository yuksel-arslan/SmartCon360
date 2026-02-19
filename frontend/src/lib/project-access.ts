import { prisma } from '@/lib/prisma';
import { ForbiddenError } from '@/lib/auth';

/**
 * Check if a user has access to a project.
 * Access is granted if the user is the project owner OR a project member.
 * Throws ForbiddenError if access is denied.
 */
export async function requireProjectAccess(userId: string, projectId: string): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });

  if (!project) {
    throw new ForbiddenError('Project not found');
  }

  // Owner always has access
  if (project.ownerId === userId) return;

  // Check project membership
  const membership = await prisma.projectMember.findFirst({
    where: { projectId, userId },
  });

  if (membership) return;

  throw new ForbiddenError();
}
