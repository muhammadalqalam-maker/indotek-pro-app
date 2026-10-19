const COEFFICIENT_SCALE = 1_000_000n;
const CENT_SCALE = 100n;

function toScaledInteger(value: number, decimals: number): bigint {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError('Nilai komponen AHSP harus berupa bilangan positif atau nol.');
  }

  return BigInt(value.toFixed(decimals).replace('.', ''));
}

function calculateLineTotalCents(coefficient: number, unitPrice: number): bigint {
  const coefficientMicros = toScaledInteger(coefficient, 6);
  const priceCents = toScaledInteger(unitPrice, 2);
  const weightedCents = coefficientMicros * priceCents;
  return (weightedCents + COEFFICIENT_SCALE / 2n) / COEFFICIENT_SCALE;
}

export function calculateAhspLineTotal(coefficient: number, unitPrice: number): number {
  return Number(calculateLineTotalCents(coefficient, unitPrice)) / Number(CENT_SCALE);
}

export function calculateAhspTotal(
  components: ReadonlyArray<{ coefficient: number; unitPrice: number }>,
): number {
  const totalCents = components.reduce(
    (total, component) => total + calculateLineTotalCents(component.coefficient, component.unitPrice),
    0n,
  );

  return Number(totalCents) / Number(CENT_SCALE);
}
