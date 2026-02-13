import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/errors';

// POST /api/v1/simulate/monte-carlo — Simplified Monte Carlo simulation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { base_plan, iterations = 1000, duration_variance_pct = 0.2 } = body;

    if (!base_plan) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'base_plan is required' } },
        { status: 400 }
      );
    }

    const zones = base_plan.zones?.length || 6;
    const trades = base_plan.wagons?.length || 7;
    const taktTime = base_plan.takt_time || 5;
    const baseDuration = (zones + trades - 1) * taktTime;

    // Run simplified Monte Carlo
    const results: number[] = [];
    for (let i = 0; i < Math.min(iterations, 5000); i++) {
      let totalDuration = 0;
      for (let t = 0; t < trades; t++) {
        for (let z = 0; z < zones; z++) {
          // Normal distribution approximation using Box-Muller
          const u1 = Math.random();
          const u2 = Math.random();
          const stdNormal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
          const duration = taktTime * (1 + stdNormal * duration_variance_pct);
          totalDuration = Math.max(totalDuration, (z + t) * taktTime + Math.max(1, duration));
        }
      }
      results.push(Math.round(totalDuration));
    }

    results.sort((a, b) => a - b);

    const p50 = results[Math.floor(results.length * 0.5)];
    const p80 = results[Math.floor(results.length * 0.8)];
    const p95 = results[Math.floor(results.length * 0.95)];
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    const variance = results.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / results.length;
    const stdDev = Math.sqrt(variance);

    const onTimeProbability = results.filter((d) => d <= baseDuration).length / results.length;

    // Build histogram
    const minDur = results[0];
    const maxDur = results[results.length - 1];
    const binCount = 20;
    const binWidth = Math.max(1, Math.ceil((maxDur - minDur) / binCount));
    const histogram: { min: number; max: number; count: number }[] = [];
    for (let b = 0; b < binCount; b++) {
      const binMin = minDur + b * binWidth;
      const binMax = binMin + binWidth;
      histogram.push({
        min: binMin,
        max: binMax,
        count: results.filter((d) => d >= binMin && d < binMax).length,
      });
    }

    const startDate = new Date(base_plan.start_date || '2026-03-01');
    const addDays = (date: Date, days: number) => {
      const d = new Date(date);
      d.setDate(d.getDate() + Math.round(days * 1.4)); // rough working→calendar
      return d.toISOString().split('T')[0];
    };

    return NextResponse.json({
      data: {
        iterations: Math.min(iterations, 5000),
        p50_end_date: addDays(startDate, p50),
        p80_end_date: addDays(startDate, p80),
        p95_end_date: addDays(startDate, p95),
        mean_duration_days: Math.round(mean * 10) / 10,
        std_dev_days: Math.round(stdDev * 10) / 10,
        on_time_probability: Math.round(onTimeProbability * 100) / 100,
        base_duration_days: baseDuration,
        critical_trades: ['MEP Rough-in', 'Drywall', 'MEP Finish'],
        histogram,
      },
      error: null,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
