export const BUDGET_TOPICS = [
  { name: 'Recharge and Bill Payments', match: ['bill', 'electricity', 'water', 'gas', 'internet', 'mobile', 'subscription', 'recharge'] },
  { name: 'Foods and Drinks', match: ['food', 'grocery', 'groceries', 'restaurant', 'dining', 'chai', 'drink'] },
  { name: 'Shopping', match: ['shopping', 'clothes', 'apparel'] },
  { name: 'Miscellaneous', match: ['miscellaneous', 'personal care', 'other'] },
  { name: 'Party and Trips', match: ['party', 'travel', 'trip', 'entertainment'] },
  { name: 'Transportations', match: ['transport', 'petrol', 'fuel', 'cab', 'auto'] },
  { name: 'Flat', match: ['rent', 'flat', 'maintenance'] },
  { name: 'Investments and Policies', match: ['investment', 'insurance', 'sip', 'mutual'] },
  { name: 'Family and Home', match: ['family', 'home', 'house'] },
];

export const topicForExpense = (expense) => {
  const text = `${expense?.category || ''} ${expense?.name || ''}`.toLowerCase();
  return BUDGET_TOPICS.find((topic) => topic.match.some((term) => text.includes(term)))?.name || 'Miscellaneous';
};

export const normalizeTopicBudgets = (budgets = {}) => Object.entries(budgets).reduce((result, [category, amount]) => {
  const topic = topicForExpense({ category });
  result[topic] = (Number(result[topic]) || 0) + (Number(amount) || 0);
  return result;
}, {});
