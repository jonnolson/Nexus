import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { formatTimestamp } from "@/lib/dates";
import { getExpense } from "@/lib/expenses/data";
import { expenseToFormValues } from "@/lib/expenses/schema";
import { updateExpenseAction } from "../actions";
import { ExpenseForm } from "../expense-form";

export const metadata: Metadata = { title: "Edit expense" };

export default function ExpensePage({ params }: PageProps<"/expenses/[id]">) {
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 p-4 md:p-8">
      <Link href="/expenses" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        Expenses
      </Link>
      <Suspense fallback={<div className="h-80 glass animate-pulse rounded-xl" />}>
        <EditExpense params={params} />
      </Suspense>
    </div>
  );
}

async function EditExpense({ params }: Pick<PageProps<"/expenses/[id]">, "params">) {
  const { id } = await params;
  const expense = await getExpense(id);
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Edit expense</h1>
      <div className="glass rounded-xl p-4 sm:p-6">
      <ExpenseForm
        mode="edit"
        action={updateExpenseAction.bind(null, expense.id)}
        defaults={expenseToFormValues(expense)}
        expenseId={expense.id}
      />
      </div>
      <p className="text-xs text-muted-foreground">
        Added {formatTimestamp(expense.created_at)}
        {expense.updated_at !== expense.created_at && ` · Updated ${formatTimestamp(expense.updated_at)}`}
      </p>
    </>
  );
}
