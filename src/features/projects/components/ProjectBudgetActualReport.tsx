import { Badge, Button } from '../../../components/ui';
import { getMessages } from '../../../i18n';
import { formatRupiah, formatTanggal } from '../../../utils/format';
import type {
  BudgetActualDivision,
  BudgetActualLine,
} from '../utils/projectBudgetActual.helpers';
import type { ProjectBoqExpense } from '../services/projectBudgetActual.service';

const messages = getMessages('id').projects.budgetActual;

type ProjectBudgetActualReportProps = {
  divisions: BudgetActualDivision[];
  expenses: ProjectBoqExpense[];
  canVerify: boolean;
  verifyingExpenseId: string | null;
  onVerify: (expense: ProjectBoqExpense) => void;
};

function VarianceValue({ value }: { value: number }) {
  return (
    <span className={value > 0 ? 'font-medium text-danger' : 'font-medium text-success'}>
      {formatRupiah(value)}
    </span>
  );
}

function ItemNumbers({ line }: { line: BudgetActualLine }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
      <div>
        <p className="text-xs text-muted">{messages.budget}</p>
        <p className="break-words font-medium text-text">{formatRupiah(line.budget)}</p>
      </div>
      <div>
        <p className="text-xs text-muted">{messages.actual}</p>
        <p className="break-words font-medium text-text">{formatRupiah(line.actual)}</p>
      </div>
      <div>
        <p className="text-xs text-muted">{messages.pending}</p>
        <p className="break-words text-text">{formatRupiah(line.pending)}</p>
      </div>
      <div>
        <p className="text-xs text-muted">{messages.variance}</p>
        <VarianceValue value={line.variance} />
      </div>
    </div>
  );
}

export function ProjectBudgetActualReport({
  divisions,
  expenses,
  canVerify,
  verifyingExpenseId,
  onVerify,
}: ProjectBudgetActualReportProps) {
  const budget = divisions.reduce((total, division) => total + division.budget, 0);
  const actual = divisions.reduce((total, division) => total + division.actual, 0);
  const pending = divisions.reduce((total, division) => total + division.pending, 0);
  const variance = actual - budget;
  const itemById = new Map(
    divisions.flatMap((division) => division.items.map((line) => [line.item.id, line.item] as const)),
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: messages.totalBudget, value: formatRupiah(budget) },
          { label: messages.totalActual, value: formatRupiah(actual) },
          { label: messages.totalPending, value: formatRupiah(pending) },
          { label: messages.totalVariance, value: formatRupiah(variance), variance: true },
        ].map(({ label, value, variance: isVariance }) => (
          <div key={label} className="min-w-0 rounded-lg border border-border bg-surface p-3 sm:p-4">
            <p className="text-xs font-medium text-muted sm:text-sm">{label}</p>
            <p className={`mt-1 break-words text-base font-semibold sm:text-lg ${isVariance && variance > 0 ? 'text-danger' : 'text-text'}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted">{messages.basisHint}</p>

      <section className="space-y-3" aria-label={messages.title}>
        <h3 className="text-base font-semibold text-text">{messages.title}</h3>
        {divisions.map((division) => (
          <div key={division.division.id} className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-surface-2 px-3 py-3 sm:px-4">
              <div className="min-w-0">
                <p className="break-words font-semibold text-text">
                  {division.division.item_code} · {division.division.description}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {messages.budget}: {formatRupiah(division.budget)}
                  {' · '}{messages.actual}: {formatRupiah(division.actual)}
                  {' · '}{messages.variance}: <VarianceValue value={division.variance} />
                </p>
              </div>
              <Badge variant={division.variance > 0 ? 'danger' : 'info'}>
                {division.variance > 0 ? messages.totalVariance : messages.actual}
              </Badge>
            </div>

            {division.items.length === 0 ? (
              <p className="p-4 text-sm text-muted">{messages.noItems}</p>
            ) : (
              <>
                <div className="divide-y divide-border md:hidden">
                  {division.items.map((line) => (
                    <article key={line.item.id} className="space-y-3 p-3">
                      <p className="break-words text-sm font-medium text-text">
                        <span className="mr-1 text-muted">{line.item.item_code}</span>
                        {line.item.description}
                      </p>
                      <ItemNumbers line={line} />
                    </article>
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-max text-left text-sm">
                    <thead className="bg-surface-2 text-xs text-muted">
                      <tr>
                        <th className="px-4 py-3 font-medium">{messages.item}</th>
                        <th className="px-4 py-3 text-right font-medium">{messages.budget}</th>
                        <th className="px-4 py-3 text-right font-medium">{messages.actual}</th>
                        <th className="px-4 py-3 text-right font-medium">{messages.pending}</th>
                        <th className="px-4 py-3 text-right font-medium">{messages.variance}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {division.items.map((line) => (
                        <tr key={line.item.id}>
                          <td className="max-w-sm px-4 py-3">
                            <span className="mr-2 text-muted">{line.item.item_code}</span>
                            <span className="break-words text-text">{line.item.description}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-text">{formatRupiah(line.budget)}</td>
                          <td className="px-4 py-3 text-right text-text">{formatRupiah(line.actual)}</td>
                          <td className="px-4 py-3 text-right text-text">{formatRupiah(line.pending)}</td>
                          <td className="px-4 py-3 text-right"><VarianceValue value={line.variance} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        ))}
      </section>

      <section className="space-y-3" aria-label={messages.expenseList}>
        <h3 className="text-base font-semibold text-text">{messages.expenseList}</h3>
        {expenses.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">{messages.noExpenses}</p>
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {expenses.map((expense) => {
                const item = itemById.get(expense.boq_item_id);
                const isPending = expense.status === 'pending';
                return (
                  <article key={expense.id} className="space-y-3 rounded-lg border border-border bg-surface p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-medium text-text">{expense.description}</p>
                        <p className="mt-1 break-words text-xs text-muted">
                          {item ? `${item.item_code} · ${item.description}` : expense.boq_item_id}
                        </p>
                      </div>
                      <Badge variant={isPending ? 'warning' : 'success'}>
                        {isPending ? messages.statusPending : messages.statusVerified}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted">{formatTanggal(expense.expense_date)}</p>
                        <p className="font-semibold text-text">{formatRupiah(expense.amount)}</p>
                      </div>
                      {isPending && canVerify && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={verifyingExpenseId === expense.id}
                          onClick={() => onVerify(expense)}
                        >
                          {messages.verify}
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
              <table className="w-full min-w-max text-left text-sm">
                <thead className="bg-surface-2 text-xs text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">{messages.expenseColumn}</th>
                    <th className="px-4 py-3 font-medium">{messages.item}</th>
                    <th className="px-4 py-3 font-medium">{messages.dateColumn}</th>
                    <th className="px-4 py-3 text-right font-medium">{messages.amount}</th>
                    <th className="px-4 py-3 font-medium">{messages.statusColumn}</th>
                    <th className="px-4 py-3 text-right font-medium">{messages.actionColumn}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {expenses.map((expense) => {
                    const item = itemById.get(expense.boq_item_id);
                    const isPending = expense.status === 'pending';
                    return (
                      <tr key={expense.id}>
                        <td className="max-w-xs px-4 py-3 break-words text-text">{expense.description}</td>
                        <td className="max-w-sm px-4 py-3 break-words text-muted">
                          {item ? `${item.item_code} · ${item.description}` : expense.boq_item_id}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted">{formatTanggal(expense.expense_date)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-text">{formatRupiah(expense.amount)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={isPending ? 'warning' : 'success'}>
                            {isPending ? messages.statusPending : messages.statusVerified}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isPending && canVerify && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={verifyingExpenseId === expense.id}
                              onClick={() => onVerify(expense)}
                            >
                              {messages.verify}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
