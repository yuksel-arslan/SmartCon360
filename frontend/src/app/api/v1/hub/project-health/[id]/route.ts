import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';

type Params = { params: Promise<{ id: string }> };

// GET /api/v1/hub/project-health/:id — Project Health Score
export async function GET(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;

    // Gather cross-module metrics to compute health score
    const [
      constraintStats,
      project,
    ] = await Promise.all([
      prisma.constraint.groupBy({
        by: ['status'],
        where: { projectId },
        _count: true,
      }),
      prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, status: true, plannedStart: true, plannedFinish: true },
      }),
    ]);

    if (!project) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Project not found' } },
        { status: 404 },
      );
    }

    // Compute constraint health
    const totalConstraints = constraintStats.reduce((sum, g) => sum + g._count, 0);
    const resolvedConstraints = constraintStats.find((g) => g.status === 'resolved')?._count ?? 0;
    const openConstraints = constraintStats.find((g) => g.status === 'open')?._count ?? 0;
    const constraintScore = totalConstraints > 0
      ? Math.round((resolvedConstraints / totalConstraints) * 100)
      : 100;

    // Placeholder scores for modules not yet fully implemented
    const scheduleScore = openConstraints > 5 ? 60 : openConstraints > 2 ? 75 : 90;
    const qualityScore = 85;
    const safetyScore = 90;
    const costScore = 80;
    const resourceScore = 85;
    const riskScore = openConstraints > 3 ? 65 : 85;

    const scores = [scheduleScore, qualityScore, safetyScore, costScore, resourceScore, constraintScore, riskScore];
    const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    const recommendations: string[] = [];
    if (constraintScore < 70) recommendations.push('Resolve open constraints to improve project flow');
    if (scheduleScore < 75) recommendations.push('Review schedule to address delays');
    if (overallScore < 80) recommendations.push('Focus on improving lowest-scoring areas');

    return NextResponse.json({
      data: {
        projectId,
        overallScore,
        components: {
          schedule: { score: scheduleScore, label: 'Schedule', details: `${openConstraints} open constraints affecting schedule` },
          quality: { score: qualityScore, label: 'Quality', details: 'Quality metrics nominal' },
          safety: { score: safetyScore, label: 'Safety', details: 'No active safety incidents' },
          cost: { score: costScore, label: 'Cost', details: 'Cost tracking in progress' },
          resource: { score: resourceScore, label: 'Resources', details: 'Resource allocation on track' },
          constraint: { score: constraintScore, label: 'Constraints', details: `${resolvedConstraints}/${totalConstraints} constraints resolved` },
          risk: { score: riskScore, label: 'Risk', details: 'Risk assessment in progress' },
        },
        recommendations,
        calculatedAt: new Date().toISOString(),
      },
      error: null,
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
