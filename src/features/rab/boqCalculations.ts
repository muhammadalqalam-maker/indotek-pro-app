export type BoqDraftItem = {
  volume: string;
  unit_price: string;
};

export type BoqDraftTotals = {
  directCost: number;
  overheadAmount: number;
  profitAmount: number;
  beforeTax: number;
  ppnAmount: number;
  grandTotal: number;
};

function toScaledInteger(value: string, scale: number): bigint {
  const normalized = value.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) return 0n;

  const [whole, fraction = ''] = normalized.split('.');
  const precision = String(scale).length - 1;
  const scaledFraction = fraction.slice(0, precision).padEnd(precision, '0');
  return BigInt(whole) * BigInt(scale) + BigInt(scaledFraction || '0');
}

function roundDivide(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / 2n) / denominator;
}

function percentageAmount(amountCents: bigint, percentage: string): bigint {
  return roundDivide(amountCents * toScaledInteger(percentage, 100), 10_000n);
}

export function calculateBoqDraftTotals(
  items: BoqDraftItem[],
  overheadPercent: string,
  profitPercent: string,
  ppnPercent: string,
): BoqDraftTotals {
  const directCostCents = items.reduce((total, item) => {
    const volume = toScaledInteger(item.volume, 10_000);
    const unitPrice = toScaledInteger(item.unit_price, 100);
    return total + roundDivide(volume * unitPrice, 10_000n);
  }, 0n);
  const overheadCents = percentageAmount(directCostCents, overheadPercent);
  const profitCents = percentageAmount(directCostCents, profitPercent);
  const beforeTaxCents = directCostCents + overheadCents + profitCents;
  const ppnCents = percentageAmount(beforeTaxCents, ppnPercent);

  return {
    directCost: Number(directCostCents) / 100,
    overheadAmount: Number(overheadCents) / 100,
    profitAmount: Number(profitCents) / 100,
    beforeTax: Number(beforeTaxCents) / 100,
    ppnAmount: Number(ppnCents) / 100,
    grandTotal: Number(beforeTaxCents + ppnCents) / 100,
  };
}
