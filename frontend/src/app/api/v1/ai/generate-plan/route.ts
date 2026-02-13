import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { errorResponse } from '@/lib/errors';

// Template data for plan generation (Layer 1 — no AI needed)
const TRADE_TEMPLATES: Record<string, { name: string; code: string; color: string; durationDays: number; crewSize: number }[]> = {
  hotel: [
    { name: 'Structure', code: 'STR', color: '#6366f1', durationDays: 5, crewSize: 8 },
    { name: 'MEP Rough-in', code: 'MEP-R', color: '#f59e0b', durationDays: 5, crewSize: 12 },
    { name: 'Drywall', code: 'DRY', color: '#10b981', durationDays: 4, crewSize: 6 },
    { name: 'MEP Finish', code: 'MEP-F', color: '#ef4444', durationDays: 4, crewSize: 8 },
    { name: 'Painting', code: 'PNT', color: '#8b5cf6', durationDays: 3, crewSize: 4 },
    { name: 'Flooring', code: 'FLR', color: '#ec4899', durationDays: 3, crewSize: 4 },
    { name: 'Final Fix', code: 'FIX', color: '#14b8a6', durationDays: 3, crewSize: 6 },
  ],
  hospital: [
    { name: 'Structure', code: 'STR', color: '#6366f1', durationDays: 6, crewSize: 10 },
    { name: 'MEP Rough-in', code: 'MEP-R', color: '#f59e0b', durationDays: 7, crewSize: 14 },
    { name: 'Medical Gas', code: 'MED-G', color: '#06b6d4', durationDays: 4, crewSize: 4 },
    { name: 'Drywall', code: 'DRY', color: '#10b981', durationDays: 5, crewSize: 8 },
    { name: 'MEP Finish', code: 'MEP-F', color: '#ef4444', durationDays: 5, crewSize: 10 },
    { name: 'Painting', code: 'PNT', color: '#8b5cf6', durationDays: 3, crewSize: 4 },
    { name: 'Flooring', code: 'FLR', color: '#ec4899', durationDays: 4, crewSize: 6 },
    { name: 'Clean Room Install', code: 'CLN', color: '#14b8a6', durationDays: 5, crewSize: 4 },
  ],
  office: [
    { name: 'Structure', code: 'STR', color: '#6366f1', durationDays: 5, crewSize: 8 },
    { name: 'Facade', code: 'FAC', color: '#0ea5e9', durationDays: 5, crewSize: 6 },
    { name: 'MEP Rough-in', code: 'MEP-R', color: '#f59e0b', durationDays: 5, crewSize: 10 },
    { name: 'Drywall', code: 'DRY', color: '#10b981', durationDays: 4, crewSize: 6 },
    { name: 'MEP Finish', code: 'MEP-F', color: '#ef4444', durationDays: 4, crewSize: 8 },
    { name: 'Ceiling', code: 'CLG', color: '#8b5cf6', durationDays: 3, crewSize: 4 },
    { name: 'Flooring', code: 'FLR', color: '#ec4899', durationDays: 3, crewSize: 4 },
    { name: 'Final Fix', code: 'FIX', color: '#14b8a6', durationDays: 2, crewSize: 6 },
  ],
  residential: [
    { name: 'Structure', code: 'STR', color: '#6366f1', durationDays: 4, crewSize: 6 },
    { name: 'MEP Rough-in', code: 'MEP-R', color: '#f59e0b', durationDays: 4, crewSize: 8 },
    { name: 'Drywall', code: 'DRY', color: '#10b981', durationDays: 3, crewSize: 4 },
    { name: 'Tiling', code: 'TIL', color: '#ef4444', durationDays: 4, crewSize: 4 },
    { name: 'MEP Finish', code: 'MEP-F', color: '#f97316', durationDays: 3, crewSize: 6 },
    { name: 'Painting', code: 'PNT', color: '#8b5cf6', durationDays: 3, crewSize: 4 },
    { name: 'Flooring', code: 'FLR', color: '#ec4899', durationDays: 2, crewSize: 3 },
    { name: 'Final Fix', code: 'FIX', color: '#14b8a6', durationDays: 2, crewSize: 4 },
  ],
};

// POST /api/v1/ai/generate-plan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project_type = 'hotel',
      floor_count = 6,
      total_area_sqm = 5000,
      zone_count,
      description,
      target_duration_days,
    } = body;

    const projectType = project_type.toLowerCase();
    const trades = TRADE_TEMPLATES[projectType] || TRADE_TEMPLATES.hotel;

    // Calculate optimal zone count if not provided
    const zoneCount = zone_count || Math.max(4, Math.min(floor_count, 10));

    // Calculate optimal takt time
    const avgDuration = trades.reduce((sum, t) => sum + t.durationDays, 0) / trades.length;
    let taktTime = Math.round(avgDuration);
    if (target_duration_days) {
      const minPeriods = zoneCount + trades.length - 1;
      taktTime = Math.max(2, Math.min(10, Math.floor(target_duration_days / minPeriods)));
    }

    // Generate zones
    const zones = Array.from({ length: zoneCount }, (_, i) => ({
      id: uuidv4(),
      name: i === 0 ? 'Ground Floor' : `${i}${i === 1 ? 'st' : i === 2 ? 'nd' : i === 3 ? 'rd' : 'th'} Floor`,
      zone_type: 'floor',
      area_sqm: Math.round(total_area_sqm / zoneCount),
      work_content_factor: 1.0,
    }));

    // Generate wagons
    const wagons = trades.map((t, i) => ({
      id: uuidv4(),
      trade_name: t.name,
      code: t.code,
      color: t.color,
      sequence_order: i + 1,
      estimated_duration_days: t.durationDays,
      crew_size: t.crewSize,
      predecessors: i > 0 ? [trades[i - 1].code] : [],
    }));

    const totalPeriods = zoneCount + trades.length - 1 + 1; // +1 buffer
    const totalDurationDays = totalPeriods * taktTime;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() + ((1 + 7 - startDate.getDay()) % 7)); // Next Monday
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + Math.round(totalDurationDays * 1.4)); // calendar days

    // Generate 3 alternatives
    const alternatives = [
      {
        name: 'Aggressive',
        takt_time_days: Math.max(2, taktTime - 1),
        total_duration_days: (zoneCount + trades.length - 1) * Math.max(2, taktTime - 1),
        risk_score: 0.65,
        trade_stacking_risk: 0.4,
        description: 'Shorter takt time, higher stacking risk, faster completion',
      },
      {
        name: 'Balanced',
        takt_time_days: taktTime,
        total_duration_days: totalDurationDays,
        risk_score: 0.25,
        trade_stacking_risk: 0.1,
        description: 'Optimal balance of duration and risk',
      },
      {
        name: 'Safe',
        takt_time_days: taktTime + 1,
        total_duration_days: (zoneCount + trades.length - 1 + 2) * (taktTime + 1),
        risk_score: 0.1,
        trade_stacking_risk: 0.02,
        description: 'Extra buffers, minimal risk, longer duration',
      },
    ];

    return NextResponse.json({
      data: {
        project_id: uuidv4(),
        project_type: projectType,
        zones,
        trades: wagons,
        takt_time_days: taktTime,
        total_periods: totalPeriods,
        buffer_days: 1,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        total_duration_working_days: totalDurationDays,
        risk_score: 0.25,
        alternatives,
        generated_by: 'template',
        ai_enhanced: false,
      },
      error: null,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
