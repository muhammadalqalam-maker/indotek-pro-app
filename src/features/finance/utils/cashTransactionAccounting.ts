import { CASH_TRANSACTION_STATUSES, type ProjectCashTransaction } from '../../../types/database';

export function isCashTransactionIncludedInActuals(
  transaction: Pick<ProjectCashTransaction, 'status'>,
): boolean {
  return transaction.status === CASH_TRANSACTION_STATUSES.verified
    || transaction.status === CASH_TRANSACTION_STATUSES.reversed;
}
