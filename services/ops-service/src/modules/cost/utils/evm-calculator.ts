// EVM (Earned Value Management) Calculator Utilities

export interface EVMInputs {
  pv: number; // Planned Value
  ev: number; // Earned Value (from hakedis)
  ac: number; // Actual Cost
  bac: number; // Budget at Completion
}

export interface EVMMetrics {
  pv: number;
  ev: number;
  ac: number;
  cv: number; // Cost Variance
  sv: number; // Schedule Variance
  cpi: number; // Cost Performance Index
  spi: number; // Schedule Performance Index
  eac: number; // Estimate at Completion
  etc: number; // Estimate to Complete
  vac: number; // Variance at Completion
  tcpi: number; // To-Complete Performance Index
}

/**
 * Calculate full EVM metrics from base inputs
 */
export function calculateEVM(inputs: EVMInputs): EVMMetrics {
  const { pv, ev, ac, bac } = inputs;

  // Variances
  const cv = ev - ac; // Cost Variance (positive = under budget)
  const sv = ev - pv; // Schedule Variance (positive = ahead of schedule)

  // Performance Indices
  const cpi = ac !== 0 ? ev / ac : 0; // CPI > 1.0 is good
  const spi = pv !== 0 ? ev / pv : 0; // SPI > 1.0 is good

  // Forecasts
  let eac = 0;
  if (cpi > 0) {
    // EAC = BAC / CPI (assuming current performance continues)
    eac = bac / cpi;
  } else {
    eac = bac; // Fallback if no performance data
  }

  const etc = eac - ac; // Estimate to Complete
  const vac = bac - eac; // Variance at Completion (positive = under budget)

  // TCPI (To-Complete Performance Index)
  // TCPI = (BAC - EV) / (BAC - AC)
  const tcpi = bac - ac !== 0 ? (bac - ev) / (bac - ac) : 0;

  return {
    pv: roundTo(pv, 2),
    ev: roundTo(ev, 2),
    ac: roundTo(ac, 2),
    cv: roundTo(cv, 2),
    sv: roundTo(sv, 2),
    cpi: roundTo(cpi, 4),
    spi: roundTo(spi, 4),
    eac: roundTo(eac, 2),
    etc: roundTo(etc, 2),
    vac: roundTo(vac, 2),
    tcpi: roundTo(tcpi, 4),
  };
}

/**
 * Calculate EV from hakedis (payment certificates)
 * EV = Cumulative payment amount (actual work performed)
 */
export function calculateEVFromHakedis(
  cumulativePaymentAmount: number
): number {
  return cumulativePaymentAmount;
}

/**
 * Calculate PV from baseline schedule
 * PV = Budgeted cost for work scheduled to date
 */
export function calculatePVFromSchedule(
  totalBudget: number,
  plannedProgressPct: number
): number {
  return (totalBudget * plannedProgressPct) / 100;
}

/**
 * Helper: Round to decimal places
 */
function roundTo(value: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Get EVM performance status
 */
export function getEVMStatus(metrics: EVMMetrics): {
  costStatus: 'under' | 'on' | 'over';
  scheduleStatus: 'ahead' | 'on' | 'behind';
  overallHealth: 'good' | 'warning' | 'critical';
} {
  const costStatus =
    metrics.cpi > 1.05 ? 'under' : metrics.cpi < 0.95 ? 'over' : 'on';
  const scheduleStatus =
    metrics.spi > 1.05 ? 'ahead' : metrics.spi < 0.95 ? 'behind' : 'on';

  let overallHealth: 'good' | 'warning' | 'critical' = 'good';
  if (metrics.cpi < 0.9 || metrics.spi < 0.9) {
    overallHealth = 'critical';
  } else if (metrics.cpi < 0.95 || metrics.spi < 0.95) {
    overallHealth = 'warning';
  }

  return { costStatus, scheduleStatus, overallHealth };
}
