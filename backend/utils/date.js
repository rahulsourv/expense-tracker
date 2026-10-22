// PostgreSQL DATE values are returned as strings by node-postgres, while
// timestamp columns may be returned as Date objects. Normalize both shapes.
export const toDateString = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};
