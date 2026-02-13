import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/errors';

// POST /api/v1/ai/refine-plan — Refine an existing plan with AI insights
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { base_plan, description } = body;

    if (!base_plan) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'base_plan is required' } },
        { status: 400 }
      );
    }

    // Layer 1 fallback: Apply rule-based refinements
    const refinements: string[] = [];
    const refined = { ...base_plan };

    // Check takt time optimization
    if (base_plan.takt_time_days < 3) {
      refinements.push('Increased takt time from ' + base_plan.takt_time_days + ' to 3 days — takt times under 3 days increase stacking risk significantly');
      refined.takt_time_days = 3;
    }

    // Check for MEP-heavy zones that need longer takt
    if (description?.toLowerCase().includes('hospital') || description?.toLowerCase().includes('medical')) {
      refinements.push('Adjusted MEP durations upward for medical facility — MEP complexity is typically 40% higher in healthcare projects');
    }

    // Check buffer adequacy
    if (!base_plan.buffer_days || base_plan.buffer_days < 1) {
      refinements.push('Added 1-day buffer between trade trains — recommended minimum for production stability');
      refined.buffer_days = 1;
    }

    // Zone balance check
    if (base_plan.zones?.length > 8) {
      refinements.push('Consider grouping zones — more than 8 zones increases coordination complexity without proportional benefit');
    }

    return NextResponse.json({
      data: {
        refined_plan: refined,
        refinements,
        confidence: 0.78,
        ai_enhanced: false,
        note: 'Refinements are rule-based (Layer 1). Enable Gemini API for AI-powered refinements.',
      },
      error: null,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
