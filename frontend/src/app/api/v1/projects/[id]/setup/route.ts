import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';

type Params = { params: Promise<{ id: string }> };

// Setup configuration keys persisted in Project.settings.setupConfig
const SETUP_CONFIG_KEYS = [
  'buildingType', 'projectPhase', 'classificationStandard',
  'floorCount', 'basementCount', 'zonesPerFloor', 'structuralZonesPerFloor', 'substructureZonesCount',
  'typicalFloorArea', 'numberOfBuildings',
  'structuralSystem', 'mepComplexity', 'flowDirection', 'deliveryMethod', 'contractPricingModel', 'siteCondition',
  'foundationType', 'groundCondition', 'groundImprovement',
] as const;

// GET /api/v1/projects/:id/setup — Get setup state
export async function GET(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;

    // Core queries (always available)
    const [project, locationCount, zoneCount, tradeCount] = await Promise.all([
      prisma.project.findUnique({
        where: { id: projectId },
        select: {
          projectType: true, currency: true, name: true, code: true, defaultTaktTime: true,
          settings: true, status: true, description: true,
          plannedStart: true, plannedFinish: true,
          address: true, city: true, country: true, budget: true,
        },
      }),
      prisma.location.count({ where: { projectId, isActive: true } }),
      prisma.location.count({ where: { projectId, isActive: true, locationType: 'zone' } }),
      prisma.trade.count({ where: { projectId } }),
    ]);

    // Setup-module queries (may fail if tables not yet created via db push)
    const safeCount = async (fn: () => Promise<number>) => { try { return await fn(); } catch { return 0; } };
    const safeFind = async <T>(fn: () => Promise<T | null>) => { try { return await fn(); } catch { return null; } };

    const [setup, drawingCount, wbsCount, cbsCount] = await Promise.all([
      safeFind(() => prisma.projectSetup.findUnique({ where: { projectId } })),
      safeCount(() => prisma.drawing.count({ where: { projectId } })),
      safeCount(() => prisma.wbsNode.count({ where: { projectId, isActive: true } })),
      safeCount(() => prisma.cbsNode.count({ where: { projectId, isActive: true } })),
    ]);

    const settings = (project?.settings as Record<string, unknown>) || {};
    const taktConfig = (settings.taktConfig as Record<string, unknown>) || {};
    const setupConfig = (settings.setupConfig as Record<string, unknown>) || {};

    const state = setup || {
      currentStep: 'classification',
      completedSteps: [],
      classificationStandard: 'uniclass',
      boqUploaded: false,
      boqFileName: null,
      boqItemCount: 0,
      drawingCount: 0,
      wbsGenerated: false,
      wbsNodeCount: 0,
      cbsGenerated: false,
      cbsNodeCount: 0,
      taktPlanGenerated: false,
    };

    return NextResponse.json({
      data: {
        ...state,
        // Merge persisted setup configuration
        ...setupConfig,
        drawingCount,
        wbsNodeCount: wbsCount,
        cbsNodeCount: cbsCount,
        wbsGenerated: wbsCount > 0,
        cbsGenerated: cbsCount > 0,
        locationCount,
        zoneCount,
        lbsConfigured: locationCount > 0,
        tradeCount,
        defaultTaktTime: (taktConfig.defaultTaktTime as number) || project?.defaultTaktTime || 5,
        bufferSize: (taktConfig.bufferSize as number) ?? 1,
        workingDays: (taktConfig.workingDays as string[]) || ['mon', 'tue', 'wed', 'thu', 'fri'],
        projectType: project?.projectType,
        currency: project?.currency,
        projectName: project?.name,
        // Project info fields (for unified setup wizard)
        projectCode: project?.code || '',
        projectDescription: project?.description || '',
        plannedStart: project?.plannedStart ? new Date(project.plannedStart).toISOString().split('T')[0] : '',
        plannedFinish: project?.plannedFinish ? new Date(project.plannedFinish).toISOString().split('T')[0] : '',
        projectCity: project?.city || '',
        projectCountry: project?.country || '',
        projectAddress: project?.address || '',
        projectBudget: project?.budget ? String(project.budget) : '',
      },
      error: null,
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}

// PATCH /api/v1/projects/:id/setup — Update setup state
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;
    const body = await request.json();

    const { currentStep, completedSteps, classificationStandard, taktPlanGenerated } = body;

    // Update ProjectSetup navigation state
    const setup = await prisma.projectSetup.upsert({
      where: { projectId },
      create: {
        projectId,
        currentStep: currentStep || 'classification',
        completedSteps: completedSteps || [],
        classificationStandard: classificationStandard || 'uniclass',
        taktPlanGenerated: taktPlanGenerated || false,
      },
      update: {
        ...(currentStep && { currentStep }),
        ...(completedSteps && { completedSteps }),
        ...(classificationStandard && { classificationStandard }),
        ...(taktPlanGenerated !== undefined && { taktPlanGenerated }),
      },
    });

    // Persist setup configuration in Project.settings.setupConfig
    const configUpdates: Record<string, unknown> = {};
    for (const key of SETUP_CONFIG_KEYS) {
      if (body[key] !== undefined) {
        configUpdates[key] = body[key];
      }
    }

    if (Object.keys(configUpdates).length > 0) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { settings: true },
      });
      const settings = (project?.settings as Record<string, unknown>) || {};
      const existingConfig = (settings.setupConfig as Record<string, unknown>) || {};

      const mergedSettings = {
        ...settings,
        setupConfig: { ...existingConfig, ...configUpdates },
      } as Prisma.InputJsonValue;

      await prisma.project.update({
        where: { id: projectId },
        data: { settings: mergedSettings },
      });
    }

    return NextResponse.json({ data: setup, error: null });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
