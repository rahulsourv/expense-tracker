// Single source of truth for user-facing expense categories.
// Legacy Essential/Flexible values are retained as the app's budget classification,
// while the parent group keeps reports and forms understandable.
const GROUPS = {
  'Housing and household': ['Rent', 'Home Loan EMI', 'Maintenance', 'Repairs', 'Furniture and Appliances', 'Home Supplies', 'Domestic Help', 'Other Household Expenses'],
  'Utilities and recurring services': ['Electricity', 'Water', 'Gas', 'Cooking gas', 'Internet', 'Mobile Recharge', 'Mobile bill', 'Landline', 'Cloud Storage', 'Software Subscriptions', 'Streaming Subscriptions', 'Subscriptions', 'Other Recurring Services'],
  Food: ['Groceries', 'Vegetables and Fruits', 'Dairy and Bakery', 'Meat and Fish', 'Restaurants and dining', 'Food Delivery', 'Snacks and Beverages', 'Tea and Coffee', 'Other Food Expenses'],
  Transportation: ['Public Transport', 'Bus and Metro', 'Taxi and Cab', 'Bike petrol', 'Fuel', 'Vehicle Maintenance', 'Vehicle Insurance', 'Parking and Tolls', 'Bike or Car EMI', 'Other Transport'],
  'Shopping and personal care': ['Clothes', 'Footwear', 'Electronics', 'Accessories', 'Skincare', 'Haircare', 'Personal Hygiene', 'Cosmetics', 'Salon and Grooming', 'Shopping', 'Other Shopping'],
  Healthcare: ['Doctor Consultation', 'Medicines', 'Diagnostics and Tests', 'Hospital', 'Dental Care', 'Vision and Eyewear', 'Health Insurance', 'Fitness and Wellness', 'Other Healthcare'],
  'Education and career': ['Tuition and College Fees', 'Books', 'Online Courses', 'Certifications', 'Exam Fees', 'Stationery', 'Software and Developer Tools', 'Professional Expenses', 'Other Education Expenses'],
  'Lifestyle and entertainment': ['Movies', 'Events and Concerts', 'Hobbies', 'Gaming', 'Sports and Recreation', 'Travel', 'Hotels and Accommodation', 'Gifts', 'Donations', 'Entertainment', 'Other Lifestyle Expenses'],
  'Financial expenses': ['Loan Interest', 'Credit Card Interest', 'Bank Charges', 'Payment Processing Fees', 'Investment Fees', 'Taxes', 'Late Fees and Penalties', 'Other Financial Expenses'],
  'Family and miscellaneous': ['Family Support', 'Childcare', 'Pet Expenses', 'Religious and Ceremonial Expenses', 'Emergency Expenses', 'Personal care', 'Insurance', 'Other bills', 'Miscellaneous', 'Other Miscellaneous Expenses'],
};

const RECURRING = new Set([
  'Rent', 'Home Loan EMI', 'Electricity', 'Water', 'Gas', 'Cooking gas', 'Internet', 'Mobile Recharge', 'Mobile bill',
  'Landline', 'Cloud Storage', 'Software Subscriptions', 'Streaming Subscriptions', 'Subscriptions',
  'Maintenance', 'Health Insurance', 'Vehicle Insurance', 'Bike or Car EMI', 'Insurance', 'Other bills',
  'Tuition and College Fees', 'Loan Interest', 'Credit Card Interest', 'Bank Charges',
]);

export const CATEGORY_GROUPS = Object.entries(GROUPS).map(([parent, categories]) => ({
  parent,
  categories: categories.map((name) => ({
    name,
    parent,
    type: RECURRING.has(name) ? 'Essential' : 'Flexible',
    icon: 'Tag',
    color: RECURRING.has(name) ? 'cyan' : 'rose',
    isDefault: true,
    active: true,
  })),
}));

export const DEFAULT_CATEGORY_REGISTRY = CATEGORY_GROUPS.flatMap((group) => group.categories);
export const DEFAULT_CATEGORY_NAMES = DEFAULT_CATEGORY_REGISTRY.map((category) => category.name);
export const DEFAULT_RECURRING_CATEGORIES = DEFAULT_CATEGORY_REGISTRY.filter((category) => category.type === 'Essential').map((category) => category.name);
export const DEFAULT_EXPENSE_CATEGORIES = DEFAULT_CATEGORY_REGISTRY.filter((category) => category.type === 'Flexible').map((category) => category.name);

export const getCategoryMeta = (name) => DEFAULT_CATEGORY_REGISTRY.find((category) => category.name === name);

export const incomeCategories = [
  'Salary', 'Freelance Income', 'Business Income', 'Bonus and Incentives',
  'Interest Income', 'Dividends', 'Rental Income', 'Refunds and Reimbursements',
  'Gifts Received', 'Other Income',
];
