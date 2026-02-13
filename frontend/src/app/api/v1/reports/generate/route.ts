import { NextRequest, NextResponse } from 'next/server';
import { generateReport } from '@/lib/stores/report-store';
import { errorResponse } from '@/lib/errors';

// POST /api/v1/reports/generate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, report_type, title, format } = body;

    if (!project_id || !report_type) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'project_id and report_type are required' } },
        { status: 400 }
      );
    }

    const report = generateReport(project_id, report_type, title, format);
    return NextResponse.json({ data: report, error: null }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
