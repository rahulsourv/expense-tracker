export const isPositiveAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0;
};

export const isValidDate = (value) => {
  if (!value) return false;
  const parsed = new Date(`${value}T12:00:00`);
  return !Number.isNaN(parsed.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(String(value));
};
