import { CreditCycle, Customer } from '@/types';
import { AppLocale, getCurrentLocale, tLocale } from '@/lib/i18n';

export type DueState = 'NO_DEBT' | 'NO_DUE_DATE' | 'UPCOMING' | 'DUE_TODAY' | 'OVERDUE';

export interface CustomerDueStatus {
  state: DueState;
  dueDate: string | null;
  dueDateFormatted: string | null;
  daysOverdue: number;
  daysUntilDue: number;
  label: string;
  shortBadge: string;
}

const MS_PER_DAY = 86_400_000;

export function getLocalTodayYmd(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDueDateDisplay(ymd?: string | null): string | null {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd.trim())) return null;
  const [y, m, d] = ymd.trim().split('-');
  return `${d}/${m}/${y}`;
}

function parseLocalYmdToMidnightMs(ymd?: string | null): number | null {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd.trim())) return null;
  const [yStr, mStr, dStr] = ymd.trim().split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    return null;
  }
  return dt.getTime();
}

export function computeSuggestedDueDate(
  option: '7D' | '15D' | '30D' | 'END_OF_MONTH' | CreditCycle,
  fromDate: Date = new Date()
): string {
  const base = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());

  if (option === 'END_OF_MONTH') {
    const endCurrentMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    if (base.getTime() === endCurrentMonth.getTime()) {
      return getLocalTodayYmd(new Date(base.getFullYear(), base.getMonth() + 2, 0));
    }
    return getLocalTodayYmd(endCurrentMonth);
  }

  const daysToAdd =
    option === '7D' || option === 'SEMANAL'
      ? 7
      : option === '15D' || option === 'QUINCENAL'
      ? 15
      : 30;

  base.setDate(base.getDate() + daysToAdd);
  return getLocalTodayYmd(base);
}

/**
 * Calcula con precisión calendario local el estado de vencimiento y los días de mora
 * de un cliente a partir de su `payment_due_date` (YYYY-MM-DD) y saldo deudor.
 */
export function getCustomerDueStatus(
  customer: Pick<Customer, 'current_balance' | 'payment_due_date'>,
  referenceDate: Date = new Date(),
  locale?: AppLocale
): CustomerDueStatus {
  const activeLocale = locale ?? getCurrentLocale();
  const rawDue = typeof customer.payment_due_date === 'string' ? customer.payment_due_date.trim() : '';
  const dueMs = parseLocalYmdToMidnightMs(rawDue);
  const dueDate = dueMs !== null ? rawDue : null;
  const dueDateFormatted = formatDueDateDisplay(dueDate);
  const balance = Number(customer.current_balance) || 0;

  if (balance <= 0) {
    return {
      state: 'NO_DEBT',
      dueDate,
      dueDateFormatted,
      daysOverdue: 0,
      daysUntilDue: 0,
      label: tLocale('Sin deuda', 'Sem dívida', activeLocale),
      shortBadge: tLocale('Al día', 'Em dia', activeLocale),
    };
  }

  if (dueMs === null || !dueDate || !dueDateFormatted) {
    return {
      state: 'NO_DUE_DATE',
      dueDate: null,
      dueDateFormatted: null,
      daysOverdue: 0,
      daysUntilDue: 0,
      label: tLocale('Sin vencimiento', 'Sem vencimento', activeLocale),
      shortBadge: '',
    };
  }

  const todayMs = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  ).getTime();

  const diffDays = Math.round((todayMs - dueMs) / MS_PER_DAY);

  if (diffDays > 0) {
    const label =
      activeLocale === 'pt'
        ? diffDays === 1
          ? '1 dia em atraso'
          : `${diffDays} dias em atraso`
        : diffDays === 1
        ? '1 día de mora'
        : `${diffDays} días de mora`;
    return {
      state: 'OVERDUE',
      dueDate,
      dueDateFormatted,
      daysOverdue: diffDays,
      daysUntilDue: 0,
      label,
      shortBadge: label,
    };
  }

  if (diffDays === 0) {
    const dueTodayLabel = tLocale('Vence hoy', 'Vence hoje', activeLocale);
    return {
      state: 'DUE_TODAY',
      dueDate,
      dueDateFormatted,
      daysOverdue: 0,
      daysUntilDue: 0,
      label: dueTodayLabel,
      shortBadge: dueTodayLabel,
    };
  }

  const remaining = Math.abs(diffDays);
  const label =
    activeLocale === 'pt'
      ? remaining === 1
        ? 'Vence amanhã'
        : `Vence em ${remaining} dias`
      : remaining === 1
      ? 'Vence mañana'
      : `Vence en ${remaining} días`;
  return {
    state: 'UPCOMING',
    dueDate,
    dueDateFormatted,
    daysOverdue: 0,
    daysUntilDue: remaining,
    label,
    shortBadge: `Vence ${dueDateFormatted}`,
  };
}
