export const calculateNextDueDate = (startDate, frequency) => {
  if (!startDate || frequency === 'Custom') return startDate || '';
  const source = new Date(`${startDate}T12:00:00`);
  if (Number.isNaN(source.getTime())) return '';
  const date = new Date(source);
  if (frequency === 'Weekly') date.setDate(date.getDate() + 7);
  else if (frequency === 'Quarterly') date.setMonth(date.getMonth() + 3);
  else if (frequency === 'Half-yearly') date.setMonth(date.getMonth() + 6);
  else if (frequency === 'Yearly') date.setFullYear(date.getFullYear() + 1);
  else {
    // Clamp month-end renewals: Jan 31 + 1 month becomes Feb 28/29, not Mar 3.
    const originalDay = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(originalDay, lastDay));
  }
  return date.toISOString().split('T')[0];
};
