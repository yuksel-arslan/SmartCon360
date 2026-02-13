import { NextRequest, NextResponse } from 'next/server';
import {
  generateTaktGrid,
  detectTradeStacking,
  calculateTotalPeriods,
  addWorkingDays,
  type ZoneInput,
  type WagonInput,
} from '@/lib/core/takt-calculator';
import { errorResponse } from '@/lib/errors';

// POST /api/v1/simulate/what-if
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { base_plan, changes } = body;

    if (!base_plan || !changes) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'base_plan and changes are required' } },
        { status: 400 }
      );
    }

    // Apply changes to create modified plan
    let modifiedTaktTime = base_plan.takt_time || 5;
    let modifiedZones: ZoneInput[] = (base_plan.zones || []).map((z: { id: string; name: string }, i: number) => ({
      id: z.id,
      name: z.name,
      sequence: i + 1,
    }));
    let modifiedWagons: WagonInput[] = (base_plan.wagons || []).map((w: { id: string; tradeId: string; sequence: number; durationDays: number; bufferAfter?: number }) => ({
      id: w.id,
      tradeId: w.tradeId,
      sequence: w.sequence,
      durationDays: w.durationDays,
      bufferAfter: w.bufferAfter || 0,
    }));
    let bufferDays = base_plan.buffer_days || 0;

    for (const change of changes) {
      switch (change.type) {
        case 'change_takt_time':
          modifiedTaktTime = change.parameters?.new_value || modifiedTaktTime;
          break;
        case 'add_buffer':
          bufferDays += change.parameters?.periods || 1;
          break;
        case 'add_crew': {
          const idx = modifiedWagons.findIndex((w: WagonInput) => w.tradeId === change.parameters?.trade_id);
          if (idx >= 0) {
            modifiedWagons[idx] = {
              ...modifiedWagons[idx],
              durationDays: Math.max(1, Math.round(modifiedWagons[idx].durationDays * 0.75)),
            };
          }
          break;
        }
        case 'move_trade': {
          const moveIdx = modifiedWagons.findIndex((w: WagonInput) => w.tradeId === change.parameters?.trade_id);
          if (moveIdx >= 0) {
            const [wagon] = modifiedWagons.splice(moveIdx, 1);
            const newSeq = (change.parameters?.new_sequence || 1) - 1;
            modifiedWagons.splice(newSeq, 0, wagon);
            modifiedWagons = modifiedWagons.map((w: WagonInput, i: number) => ({ ...w, sequence: i + 1 }));
          }
          break;
        }
        case 'remove_trade':
          modifiedWagons = modifiedWagons
            .filter((w: WagonInput) => w.tradeId !== change.parameters?.trade_id)
            .map((w: WagonInput, i: number) => ({ ...w, sequence: i + 1 }));
          break;
        case 'delay_zone': {
          // Delay shifts the zone later, effectively adding days
          bufferDays += change.parameters?.days || 0;
          break;
        }
      }
    }

    const startDate = new Date(base_plan.start_date || '2026-03-01');

    // Original calculation
    const origPeriods = calculateTotalPeriods(
      modifiedZones.length,
      (base_plan.wagons || []).length,
      base_plan.buffer_days || 0
    );
    const origEndDate = addWorkingDays(startDate, origPeriods * (base_plan.takt_time || 5));

    // Simulated calculation
    const simAssignments = generateTaktGrid(modifiedZones, modifiedWagons, startDate, modifiedTaktTime);
    const simPeriods = calculateTotalPeriods(modifiedZones.length, modifiedWagons.length, bufferDays);
    const simEndDate = addWorkingDays(startDate, simPeriods * modifiedTaktTime);
    const stacking = detectTradeStacking(simAssignments);

    const deltaDays = Math.round((simEndDate.getTime() - origEndDate.getTime()) / (1000 * 60 * 60 * 24));

    return NextResponse.json({
      data: {
        original_end_date: origEndDate.toISOString().split('T')[0],
        simulated_end_date: simEndDate.toISOString().split('T')[0],
        delta_days: deltaDays,
        trade_stacking_conflicts: stacking,
        total_periods: simPeriods,
        takt_time: modifiedTaktTime,
        num_zones: modifiedZones.length,
        num_trades: modifiedWagons.length,
        cost_impact: deltaDays * -1500,
        risk_score_change: stacking.length > 0 ? 0.15 : -0.1,
        warnings: stacking.length > 0
          ? [`${stacking.length} trade stacking conflict(s) detected in simulated plan`]
          : ['No conflicts detected — simulation looks clean'],
      },
      error: null,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
