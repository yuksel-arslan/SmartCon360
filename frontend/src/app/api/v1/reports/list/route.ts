import { NextRequest, NextResponse } from 'next/server';
import { listReports, getReport, deleteReport } from '@/lib/stores/report-store';
import { errorResponse } from '@/lib/errors';

// GET /api/v1/reports/list?projectId=xxx
export async function GET(request: NextRequest) {
  try {
    const projectId = new URL(request.url).searchParams.get('projectId') || 'demo-project-001';
    return NextResponse.json({ data: listReports(projectId), error: null });
  } catch (err) {
    return errorResponse(err);
  }
}
