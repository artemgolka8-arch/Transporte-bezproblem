// «Зарплаты и бонусы»: общие типы и чистые функции (без доступа к базе),
// чтобы их можно было использовать и на сервере, и в браузере.
import type { Role } from "@/lib/roles";
import { avatarVersion } from "@/lib/avatar";

export const PAYROLL_KINDS = ["SALARY", "BONUS", "ADVANCE", "OTHER"] as const;
export type PayrollKind = (typeof PAYROLL_KINDS)[number];

export const PAYROLL_METHODS = ["BANK_ACCOUNT", "CARD", "CASH"] as const;
export type PayrollMethod = (typeof PAYROLL_METHODS)[number];

// Строка таблицы «Зарплаты и бонусы» в том виде, в каком она уходит в браузер
export type PayrollRow = {
  id: string;
  recipientId: string | null;
  recipientName: string;
  recipientRole: Role | null;
  avatarV: string | null;
  kind: PayrollKind;
  amount: number;
  method: PayrollMethod;
  accountNumber: string | null;
  description: string;
  paidAt: string; // ISO, всегда полночь UTC выбранной даты
  createdByName: string | null;
  createdAt: string;
};

type EntryLike = {
  id: string;
  recipientId: string | null;
  recipientName: string;
  kind: PayrollKind;
  amount: number;
  method: PayrollMethod;
  accountNumber: string | null;
  description: string;
  paidAt: Date;
  createdByName: string | null;
  createdAt: Date;
};

export function toPayrollRow(
  e: EntryLike,
  recipient?: { role: Role; avatarUrl: string | null } | null
): PayrollRow {
  return {
    id: e.id,
    recipientId: e.recipientId,
    recipientName: e.recipientName,
    recipientRole: recipient?.role ?? null,
    avatarV: recipient?.avatarUrl ? avatarVersion(recipient.avatarUrl) : null,
    kind: e.kind,
    amount: e.amount,
    method: e.method,
    accountNumber: e.accountNumber,
    description: e.description,
    paidAt: e.paidAt.toISOString(),
    createdByName: e.createdByName,
    createdAt: e.createdAt.toISOString(),
  };
}

export type PayrollInput = {
  recipientId: string | null;
  manualName: string | null;
  kind: PayrollKind;
  amount: number;
  method: PayrollMethod;
  accountNumber: string | null;
  description: string;
  paidAt: Date;
};

// Проверка тела запроса (создание и редактирование). Возвращает либо ошибку, либо чистые данные.
export function parsePayrollInput(
  body: Record<string, unknown>
): { ok: true; data: PayrollInput } | { ok: false; error: string } {
  const recipientId = typeof body.recipientId === "string" && body.recipientId ? body.recipientId : null;
  const manualName = typeof body.recipientName === "string" ? body.recipientName.trim() : "";
  if (!recipientId && !manualName) return { ok: false, error: "Выберите получателя" };
  if (manualName.length > 120) return { ok: false, error: "Слишком длинное имя получателя" };

  if (!PAYROLL_KINDS.includes(body.kind as PayrollKind)) {
    return { ok: false, error: "Укажите тип выплаты" };
  }
  if (!PAYROLL_METHODS.includes(body.method as PayrollMethod)) {
    return { ok: false, error: "Укажите способ выдачи" };
  }
  const method = body.method as PayrollMethod;

  const amount = Math.round(Number(body.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000_000) {
    return { ok: false, error: "Укажите сумму больше нуля" };
  }

  const rawAccount = typeof body.accountNumber === "string" ? body.accountNumber.trim() : "";
  if (rawAccount.length > 64) return { ok: false, error: "Слишком длинный номер счёта" };
  if (method === "BANK_ACCOUNT" && !rawAccount) {
    return { ok: false, error: "Укажите номер счёта" };
  }
  // Для наличных номера счёта нет
  const accountNumber = method === "CASH" ? null : rawAccount || null;

  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!description) return { ok: false, error: "Укажите, за что выдана выплата" };
  if (description.length > 500) return { ok: false, error: "Слишком длинное описание" };

  const paidAtStr = typeof body.paidAt === "string" ? body.paidAt : "";
  const paidAt = new Date(paidAtStr);
  if (!/^\d{4}-\d{2}-\d{2}/.test(paidAtStr) || Number.isNaN(paidAt.getTime())) {
    return { ok: false, error: "Укажите дату выдачи" };
  }

  return {
    ok: true,
    data: {
      recipientId,
      manualName: manualName || null,
      kind: body.kind as PayrollKind,
      amount,
      method,
      accountNumber,
      description,
      paidAt,
    },
  };
}
