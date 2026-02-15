import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';

type Params = { params: Promise<{ id: string }> };

// POST /api/v1/projects/:id/boq/confirm — Confirm and store BOQ items
export async function POST(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;
    const { items, currency } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION', message: 'No items to import' } },
        { status: 400 },
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { currency: true },
    });

    const projectCurrency = currency || project?.currency || 'USD';

    const workItems = items
      .filter((i: { isValid: boolean }) => i.isValid)
      .map((item: Record<string, unknown>, index: number) => ({
        code: item.code,
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice || ((item.unitPrice as number) ? (item.quantity as number) * (item.unitPrice as number) : undefined),
        category: item.category || 'general',
        wbsCode: item.wbsCode,
        sortOrder: index,
        source: 'boq_import',
        currency: projectCurrency,
      }));

    // Store BOQ data in project settings
    await prisma.project.update({
      where: { id: projectId },
      data: {
        settings: {
          boqImport: {
            importedAt: new Date().toISOString(),
            itemCount: workItems.length,
            currency: projectCurrency,
            items: workItems,
          },
        },
      },
    });

    await prisma.projectSetup.upsert({
      where: { projectId },
      create: { projectId, boqUploaded: true, boqItemCount: workItems.length, completedSteps: ['boq'] },
      update: { boqUploaded: true, boqItemCount: workItems.length },
    });

    return NextResponse.json({
      data: { imported: workItems.length, items: workItems },
      error: null,
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
