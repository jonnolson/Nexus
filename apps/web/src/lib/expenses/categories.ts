/**
 * Expense categories, mirroring the DB check in 20261110050000_expenses.sql.
 * Based on CRA T2125 (business income) expense lines; `cra` is a hint for tax time.
 * Not tax advice: confirm treatment (e.g. meals at 50%) with an accountant.
 */
export const EXPENSE_CATEGORIES = [
  { value: "advertising", label: "Advertising & marketing", cra: "Advertising" },
  { value: "meals", label: "Meals & entertainment", cra: "Meals and entertainment (generally 50% deductible)" },
  { value: "office", label: "Office expenses", cra: "Office expenses" },
  { value: "supplies", label: "Supplies", cra: "Supplies" },
  { value: "software", label: "Software & subscriptions", cra: "Office expenses / Other" },
  { value: "professional_fees", label: "Professional fees (legal, accounting)", cra: "Legal, accounting and other professional fees" },
  { value: "subcontractors", label: "Subcontractors", cra: "Management and administration fees / Other" },
  { value: "rent", label: "Rent", cra: "Rent" },
  { value: "phone_internet", label: "Phone & internet", cra: "Telephone and utilities" },
  { value: "travel", label: "Travel", cra: "Travel expenses" },
  { value: "vehicle", label: "Vehicle", cra: "Motor vehicle expenses" },
  { value: "insurance", label: "Insurance", cra: "Insurance" },
  { value: "bank_fees", label: "Bank fees & interest", cra: "Interest and bank charges" },
  { value: "equipment", label: "Equipment & hardware", cra: "Capital cost allowance (if a capital asset)" },
  { value: "education", label: "Education & training", cra: "Other expenses" },
  { value: "other", label: "Other", cra: "Other expenses" },
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["value"];
export const EXPENSE_CATEGORY_VALUES = EXPENSE_CATEGORIES.map((c) => c.value) as [ExpenseCategory, ...ExpenseCategory[]];
export const categoryLabel = (v: string) => EXPENSE_CATEGORIES.find((c) => c.value === v)?.label ?? v;
export const CATEGORY_OPTIONS = EXPENSE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }));
