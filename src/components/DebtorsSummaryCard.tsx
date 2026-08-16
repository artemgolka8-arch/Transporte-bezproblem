"use client";

import { useTranslation } from "@/lib/i18n/LanguageProvider";

export type DebtorsSummary = {
  totalDebt: number;
  debtorCount: number;
  lastSync: {
    prevTotalDebt: number;
    newTotalDebt: number;
    prevDebtorCount: number;
    newDebtorCount: number;
    createdAt: string;
  } | null;
};

function formatMoney(value: number) {
  return `${value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}\u00A0zł`;
}

function TrendIcon({ down }: { down: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={down ? "" : "rotate-180"}
    >
      <path d="M6 8l6 8 6-8" />
    </svg>
  );
}

export function DebtorsSummaryCard({ summary }: { summary: DebtorsSummary }) {
  const { t } = useTranslation();
  const { totalDebt, debtorCount, lastSync } = summary;

  const delta = lastSync ? lastSync.newTotalDebt - lastSync.prevTotalDebt : 0;
  const improved = delta <= 0;

  return (
    <div className="panel mb-5 grid grid-cols-1 divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <div className="px-5 py-4">
        <div className="label-eyebrow">{t("debtors_summary_total_debt")}</div>
        <div className="mt-1 font-display text-2xl font-semibold text-ink">{formatMoney(totalDebt)}</div>
      </div>
      <div className="px-5 py-4">
        <div className="label-eyebrow">{t("debtors_summary_debtor_count")}</div>
        <div className="mt-1 font-display text-2xl font-semibold text-ink">{debtorCount}</div>
      </div>
      <div className="px-5 py-4">
        <div className="label-eyebrow">{t("debtors_summary_change")}</div>
        {lastSync ? (
          <div className="mt-1 flex items-center gap-2">
            <span className="font-display text-base font-semibold text-muted">
              {formatMoney(lastSync.prevTotalDebt)}
            </span>
            <span className="text-faint">→</span>
            <span className="font-display text-base font-semibold text-ink">
              {formatMoney(lastSync.newTotalDebt)}
            </span>
            {delta !== 0 && (
              <span
                className={`inline-flex items-center gap-0.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                  improved ? "bg-mintDim/50 text-mint" : "bg-danger/10 text-danger"
                }`}
              >
                <TrendIcon down={improved} />
                {formatMoney(Math.abs(delta))}
              </span>
            )}
          </div>
        ) : (
          <div className="mt-1 text-sm text-muted">{t("debtors_summary_no_sync")}</div>
        )}
      </div>
    </div>
  );
}
