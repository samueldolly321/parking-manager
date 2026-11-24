/** Closing and reopening a cash register (shared by the server, the page and the tests). */
import type { CashRegister, CashRegisterClosure } from '../types';

/**
 * Closes the register: compares the cash counted with the cash expected, keeps the day's figures
 * in the closure history. While closed, payments and expenses are no longer added to it.
 */
export function closeRegister(
  reg: CashRegister,
  input: { countedCashAr: number; notes?: string },
  now: string,
  by: string
): { patch: Partial<CashRegister>; closure: CashRegisterClosure } {
  const expected = reg.currentCashInHandAr || 0;
  const counted = Math.max(0, Math.round(input.countedCashAr));
  const closure: CashRegisterClosure = {
    openedAt: reg.openedAt,
    closedAt: now,
    closedBy: by,
    cashierName: reg.cashierName,
    openingBalanceAr: reg.openingBalanceAr || 0,
    cashCollectedAr: reg.totalCashCollectedAr || 0,
    mobileMoneyAr: reg.totalMobileMoneyAr || 0,
    expensesPaidAr: reg.totalExpensesPaidAr || 0,
    expectedCashAr: expected,
    countedCashAr: counted,
    differenceAr: counted - expected,
    notes: (input.notes || '').trim()
  };
  return {
    patch: { status: 'cloturee', currentCashInHandAr: counted, closures: [closure, ...(reg.closures || [])].slice(0, 400) },
    closure
  };
}

/** Opens a new session: day totals back to zero, the opening float is the cash left in the drawer. */
export function openRegister(
  reg: CashRegister,
  input: { openingBalanceAr: number; cashierName?: string },
  now: string
): Partial<CashRegister> {
  const opening = Math.max(0, Math.round(input.openingBalanceAr));
  return {
    status: 'ouverte',
    openedAt: now,
    cashierName: (input.cashierName || '').trim() || reg.cashierName,
    openingBalanceAr: opening,
    totalCashCollectedAr: 0,
    totalMobileMoneyAr: 0,
    totalExpensesPaidAr: 0,
    currentCashInHandAr: opening
  };
}
