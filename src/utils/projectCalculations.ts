import type { Project } from '../types/database';

/**
 * Calculation rules for construction project metrics
 */

export type ProjectHealth = 'on_track' | 'at_risk' | 'delayed' | 'ahead';

export interface ProgressStatus {
  health: ProjectHealth;
  deviation: number;
  label: string;
  badgeColor: string;
}

/**
 * Calculate progress deviation (Actual % - Planned %) and health status
 */
export function calculateProjectHealth(actualProgress: number, plannedProgress: number): ProgressStatus {
  const deviation = Math.round((actualProgress - plannedProgress) * 100) / 100;

  if (deviation >= 2) {
    return {
      health: 'ahead',
      deviation,
      label: `Lebih Cepat (+${deviation.toFixed(1).replace('.', ',')}%)`,
      badgeColor: 'emerald',
    };
  }

  if (deviation >= -3) {
    return {
      health: 'on_track',
      deviation,
      label: deviation === 0 ? 'Tepat Waktu (0,0%)' : `Sesuai Target (${deviation.toFixed(1).replace('.', ',')}%)`,
      badgeColor: 'sky',
    };
  }

  if (deviation >= -8) {
    return {
      health: 'at_risk',
      deviation,
      label: `Perlu Perhatian (${deviation.toFixed(1).replace('.', ',')}%)`,
      badgeColor: 'amber',
    };
  }

  return {
    health: 'delayed',
    deviation,
    label: `Kritis / Terlambat (${deviation.toFixed(1).replace('.', ',')}%)`,
    badgeColor: 'rose',
  };
}

/**
 * Calculate budget variance and remaining budget
 */
export function calculateBudgetMetrics(contractValue: number, realizedCost: number) {
  const remainingBudget = contractValue - realizedCost;
  const costPercentage = contractValue > 0 ? (realizedCost / contractValue) * 100 : 0;
  const isOverBudget = realizedCost > contractValue;

  return {
    remainingBudget,
    costPercentage: Math.round(costPercentage * 10) / 10,
    isOverBudget,
  };
}

/**
 * Calculate contract value with addendums/variation orders (VO)
 */
export function calculateTotalContractWithAddendums(
  baseContract: number,
  addendums: { amount: number; approved_at?: string | null }[],
): number {
  const addendumTotal = addendums.reduce(
    (sum, item) => sum + (item.approved_at ? item.amount || 0 : 0),
    0,
  );
  return baseContract + addendumTotal;
}

export function calculateEffectiveProjectContractValue(
  project: Pick<Project, 'contract_value' | 'addendums'>,
): number {
  return calculateTotalContractWithAddendums(project.contract_value, project.addendums ?? []);
}

export function calculateApprovedTimeExtensionDays(
  addendums: { time_extension_days: number; approved_at?: string | null }[],
): number {
  return addendums.reduce(
    (total, item) => total + (item.approved_at ? item.time_extension_days || 0 : 0),
    0,
  );
}

export function calculateEffectiveContractEndDate(
  endDate: string,
  approvedExtensionDays: number,
): string {
  const date = new Date(`${endDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || !Number.isInteger(approvedExtensionDays)) return endDate;
  date.setUTCDate(date.getUTCDate() + approvedExtensionDays);
  return date.toISOString().slice(0, 10);
}

/**
 * Calculate retention amount (default usually 5%)
 */
export function calculateRetention(contractValue: number, retentionPercent: number = 5): number {
  return Math.round(contractValue * (retentionPercent / 100));
}
