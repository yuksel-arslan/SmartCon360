import { NextRequest, NextResponse } from 'next/server';
import { generateReport } from '@/lib/stores/report-store';
import { errorResponse } from '@/lib/errors';

// POST /api/v1/reports/generate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Accept both { type } (frontend) and { report_type } (canonical) naming
    const reportType = body.report_type || body.type;
    const projectId = body.project_id || 'default';
    const { title, format } = body;

    if (!reportType) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'report_type (or type) is required' } },
        { status: 400 }
      );
    }

    const report = generateReport(projectId, reportType, title, format);
    return NextResponse.json({ data: report, error: null }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
