"use client";

import { useState } from "react";
import { KeyIcon } from "./VehicleIcons";
import { canEdit } from "@/lib/roles";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

export type KeyData = {
  id: string;
  label: string;
  isDuplicate: boolean;
  holder?: string | null;
  notes?: string | null;
};

const PALETTE = [
  { text: "text-cyan", border: "border-cyan/40", bg: "bg-cyanDim/50", glow: "shadow-glowCyan" },
  { text: "text-mint", border: "border-mint/40", bg: "bg-mintDim/50", glow: "shadow-glowMint" },
  { text: "text-amber", border: "border-amber/40", bg: "bg-amberDim/50", glow: "shadow-glowAmber" },
  { text: "text-violet", border: "border-violet/40", bg: "bg-violetDim/50", glow: "shadow-glowViolet" },
];

function colorForLabel(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function KeyPeg({
  keyData,
  role,
  onUpdate,
  onDelete,
}: {
  keyData: KeyData;
  role: "ADMIN" | "MANAGER" | "VIEWER";
  onUpdate: (id: string, data: Partial<KeyData>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const c = colorForLabel(keyData.label);
  const [editing, setEditing] = useState(false);
  const [holder, setHolder] = useState(keyData.holder || "");
  const [notes, setNotes] = useState(keyData.notes || "");
  const [saving, setSaving] = useState(false);
  const editable = canEdit(role);

  async function save() {
    setSaving(true);
    await onUpdate(keyData.id, { holder, notes });
    setSaving(false);
    setEditing(false);
  }

  return (
    <div className="group relative flex flex-col items-center pt-5">
      {/* peg / hook */}
      <div className="absolute top-0 h-3 w-3 rounded-full border border-line bg-panel2" />
      <div className="absolute top-1.5 h-4 w-px bg-line" />

      <div
        className={`relative mt-4 flex w-full flex-col items-center gap-2 rounded-xl border ${c.border} ${c.bg} px-3 pb-3 pt-6 transition-transform duration-300 group-hover:animate-floatKey`}
      >
        {keyData.isDuplicate && (
          <span className="absolute -top-2 right-2 rounded-full border border-line bg-bg2 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-muted">
            {t("duplicate_badge")}
          </span>
        )}

        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${c.bg} ${c.glow}`}>
          <KeyIcon className={`h-6 w-6 ${c.text}`} />
        </div>

        <div className="text-center">
          <div className="font-display text-[13px] font-medium leading-tight text-ink">
            {keyData.label}
          </div>
          {!editing && (
            <div className="mt-0.5 text-[11px] text-muted">
              {keyData.holder ? t("holder_prefix", { holder: keyData.holder }) : t("no_holder")}
            </div>
          )}
        </div>

        {editing ? (
          <div className="w-full space-y-2 pt-1">
            <input
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
              placeholder={t("key_holder_placeholder")}
              className="w-full rounded-md border border-line bg-bg2 px-2 py-1.5 text-xs text-ink outline-none focus:border-cyan/50"
            />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("key_notes_placeholder")}
              rows={2}
              className="w-full resize-none rounded-md border border-line bg-bg2 px-2 py-1.5 text-xs text-ink outline-none focus:border-cyan/50"
            />
            <div className="flex gap-1.5">
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 rounded-md border border-cyan/40 bg-cyanDim/40 py-1 text-[11px] text-cyan"
              >
                {saving ? "…" : t("save")}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex-1 rounded-md border border-line py-1 text-[11px] text-muted"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        ) : (
          editable && (
            <div className="flex w-full gap-1.5 pt-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => setEditing(true)}
                className="flex-1 rounded-md border border-line py-1 text-[11px] text-muted hover:text-ink"
              >
                {t("edit_action")}
              </button>
              <button
                onClick={() => onDelete(keyData.id)}
                className="flex-1 rounded-md border border-line py-1 text-[11px] text-muted hover:border-danger/40 hover:text-danger"
              >
                {t("delete_action")}
              </button>
            </div>
          )
        )}

        {keyData.notes && !editing && (
          <div className="w-full border-t border-line/60 pt-2 text-[11px] text-muted">
            {keyData.notes}
          </div>
        )}
      </div>
    </div>
  );
}
