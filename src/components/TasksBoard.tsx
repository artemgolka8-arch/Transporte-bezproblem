"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { canEdit, ROLE_LABEL_KEYS, Role } from "@/lib/roles";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { Lang } from "@/lib/i18n/translations";

type TaskUser = { id: string; name: string };
type AssignableUser = { id: string; name: string; role: Role };

type TaskLog = {
  id: string;
  action: string;
  fromUserName: string | null;
  toUserName: string | null;
  note: string | null;
  userName: string | null;
  createdAt: string;
};

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: "OPEN" | "DONE";
  dueDate: string | null;
  reminderAt: string | null;
  reminderSentAt: string | null;
  creator: TaskUser;
  assignee: TaskUser;
  history: TaskLog[];
};

const LOCALE_MAP: Record<Lang, string> = { ru: "ru-RU", pl: "pl-PL", uk: "uk-UA" };

type Filter = "all" | "mine" | "open" | "done";

export function TasksBoard({
  initialTasks,
  users,
  role,
  currentUserId,
}: {
  initialTasks: TaskRow[];
  users: AssignableUser[];
  role: Role;
  currentUserId: string;
}) {
  const router = useRouter();
  const { t, lang } = useTranslation();
  const [tasks, setTasks] = useState<TaskRow[]>(initialTasks);
  const [filter, setFilter] = useState<Filter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const editable = canEdit(role);

  const filtered = useMemo(() => {
    switch (filter) {
      case "mine":
        return tasks.filter((task) => task.assignee.id === currentUserId);
      case "open":
        return tasks.filter((task) => task.status === "OPEN");
      case "done":
        return tasks.filter((task) => task.status === "DONE");
      default:
        return tasks;
    }
  }, [tasks, filter, currentUserId]);

  function replaceTask(updated: TaskRow) {
    setTasks((prev) => prev.map((task) => (task.id === updated.id ? updated : task)));
  }

  async function runAction(taskId: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || t("task_action_failed"));
      return;
    }
    const updated = await res.json();
    replaceTask(updated);
    router.refresh();
  }

  async function deleteTask(taskId: string) {
    if (!confirm(t("delete_task_confirm"))) return;
    const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    if (res.ok) {
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      router.refresh();
    }
  }

  const FILTERS: { key: Filter; labelKey: Parameters<typeof t>[0] }[] = [
    { key: "all", labelKey: "tasks_filter_all" },
    { key: "mine", labelKey: "tasks_filter_mine" },
    { key: "open", labelKey: "tasks_filter_open" },
    { key: "done", labelKey: "tasks_filter_done" },
  ];

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="label-eyebrow mb-1">{t("tasks_eyebrow")}</div>
          <h1 className="font-display text-2xl font-semibold text-ink">{t("tasks_title")}</h1>
        </div>
        {editable && (
          <button onClick={() => setFormOpen(true)} className="btn-primary">
            {t("new_task_btn")}
          </button>
        )}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-1 rounded-lg border border-line bg-panel p-1 w-fit">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-md px-3.5 py-1.5 text-sm transition-colors ${
              filter === f.key ? "bg-panel2 text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {t(f.labelKey)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="panel flex flex-col items-center gap-1 py-14 text-center">
          <div className="text-sm text-ink">{t("tasks_empty_title")}</div>
          <div className="text-xs text-muted">{t("tasks_empty_subtitle")}</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              users={users}
              role={role}
              currentUserId={currentUserId}
              lang={lang}
              onAction={(body) => runAction(task.id, body)}
              onDelete={() => deleteTask(task.id)}
            />
          ))}
        </div>
      )}

      {formOpen && (
        <NewTaskModal
          users={users}
          currentUserId={currentUserId}
          onClose={() => setFormOpen(false)}
          onCreated={(task) => {
            setFormOpen(false);
            setTasks((prev) => [task, ...prev]);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function TaskCard({
  task,
  users,
  role,
  currentUserId,
  lang,
  onAction,
  onDelete,
}: {
  task: TaskRow;
  users: AssignableUser[];
  role: Role;
  currentUserId: string;
  lang: Lang;
  onAction: (body: Record<string, unknown>) => Promise<void>;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const isAssignee = task.assignee.id === currentUserId;
  const isCreator = task.creator.id === currentUserId;
  const canAct = isAssignee || isCreator;
  const canDelete = isCreator;
  const done = task.status === "DONE";

  async function wrap(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[200px] flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide ${
                done
                  ? "border-mint/40 bg-mintDim/40 text-mint"
                  : "border-amber/40 bg-amberDim/40 text-amber"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${done ? "bg-mint" : "bg-amber"}`} />
              {t(done ? "task_status_done" : "task_status_open")}
            </span>
            {task.dueDate && (
              <span className="text-xs text-muted">
                {t("task_due_label", { date: new Date(task.dueDate).toLocaleDateString(LOCALE_MAP[lang]) })}
              </span>
            )}
            {task.reminderAt && (
              <span
                className={`inline-flex items-center gap-1 text-xs ${
                  task.reminderSentAt ? "text-faint" : "text-cyan"
                }`}
              >
                🔔{" "}
                {t(task.reminderSentAt ? "task_reminder_sent_label" : "task_reminder_label", {
                  date: new Date(task.reminderAt).toLocaleString(LOCALE_MAP[lang]),
                })}
              </span>
            )}
          </div>
          <div className="font-display text-base font-semibold text-ink">{task.title}</div>
          {task.description && <p className="mt-1 text-sm text-muted">{task.description}</p>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-faint">
            <span>{t("task_assignee_label", { name: task.assignee.name })}</span>
            <span>{t("task_creator_label", { name: task.creator.name })}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {canAct && (
            <button
              disabled={busy}
              onClick={() => wrap(() => onAction({ action: done ? "reopen" : "complete" }))}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90 disabled:opacity-50 ${
                done
                  ? "border-line text-muted hover:text-ink"
                  : "border-mint/40 bg-mintDim/40 text-mint"
              }`}
            >
              {t(done ? "reopen_btn" : "mark_done_btn")}
            </button>
          )}
          {canAct && (
            <button
              disabled={busy}
              onClick={() => setTransferOpen(true)}
              className="rounded-lg border border-violet/40 bg-violetDim/40 px-3 py-1.5 text-xs font-medium text-violet transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {t("transfer_btn")}
            </button>
          )}
          {canDelete && (
            <button
              disabled={busy}
              onClick={onDelete}
              className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
            >
              {t("delete_task_btn")}
            </button>
          )}
        </div>
      </div>

      <button
        onClick={() => setHistoryOpen((prev) => !prev)}
        className="mt-3 text-xs text-muted underline decoration-dotted underline-offset-2 hover:text-ink"
      >
        {t(historyOpen ? "task_history_toggle_hide" : "task_history_toggle_show")}
      </button>

      {historyOpen && (
        <div className="mt-3 space-y-2.5 border-t border-line/60 pt-3">
          {task.history.length === 0 ? (
            <p className="text-xs text-muted">{t("task_history_empty")}</p>
          ) : (
            task.history.map((h) => (
              <div key={h.id} className="flex gap-2.5">
                <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" />
                <div>
                  <div className="text-xs text-ink">{describeLog(h, t)}</div>
                  <div className="text-[11px] text-faint">
                    {new Date(h.createdAt).toLocaleString(LOCALE_MAP[lang])}
                    {h.userName ? ` · ${h.userName}` : ""}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {transferOpen && (
        <TransferModal
          users={users.filter((u) => u.id !== task.assignee.id)}
          onClose={() => setTransferOpen(false)}
          onSubmit={async (toUserId, note) => {
            await wrap(() => onAction({ action: "transfer", toUserId, note }));
            setTransferOpen(false);
          }}
        />
      )}
    </div>
  );
}

function describeLog(h: TaskLog, t: (key: any, vars?: Record<string, string | number>) => string) {
  switch (h.action) {
    case "created":
      return t("task_log_created", { name: h.toUserName || "" });
    case "completed":
      return h.note ? `${t("task_log_completed")} — ${h.note}` : t("task_log_completed");
    case "reopened":
      return h.note ? `${t("task_log_reopened")} — ${h.note}` : t("task_log_reopened");
    case "transferred": {
      const base = t("task_log_transferred", { from: h.fromUserName || "", to: h.toUserName || "" });
      return h.note ? `${base} — ${h.note}` : base;
    }
    case "edited":
      return t("task_log_edited");
    case "reminder_sent":
      return t("task_log_reminder_sent");
    case "reminder_failed":
      return h.note ? `${t("task_log_reminder_failed")} — ${h.note}` : t("task_log_reminder_failed");
    default:
      return h.action;
  }
}

function NewTaskModal({
  users,
  currentUserId,
  onClose,
  onCreated,
}: {
  users: AssignableUser[];
  currentUserId: string;
  onClose: () => void;
  onCreated: (task: TaskRow) => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState(currentUserId);
  const [dueDate, setDueDate] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError(t("tasks_fill_required"));
      return;
    }
    setError(null);
    setLoading(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        assigneeId,
        dueDate: dueDate || null,
        // datetime-local отдаёт строку без часового пояса ("2026-08-16T11:30") — превращаем
        // её в точный момент времени прямо в браузере (где реально известен часовой пояс
        // пользователя), а не отправляем как есть, иначе сервер (работает по UTC) поймёт
        // это время неправильно
        reminderAt: reminderAt ? new Date(reminderAt).toISOString() : null,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || t("task_create_failed"));
      return;
    }
    const task = await res.json();
    onCreated(task);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm px-4 py-8">
      <form onSubmit={submit} className="panel w-full max-w-sm p-6 animate-rise">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">{t("new_task_title")}</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>

        <label className="mb-1 block label-eyebrow">{t("field_task_title")}</label>
        <input
          required
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("task_title_placeholder")}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        />

        <label className="mb-1 block label-eyebrow">{t("field_task_description")}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder={t("task_description_placeholder")}
          className="mb-4 w-full resize-none rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        />

        <label className="mb-1 block label-eyebrow">{t("field_task_assignee")}</label>
        <select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} · {t(ROLE_LABEL_KEYS[u.role])}
            </option>
          ))}
        </select>

        <label className="mb-1 block label-eyebrow">{t("field_task_due_date")}</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        />

        <label className="mb-1 block label-eyebrow">{t("field_task_reminder")}</label>
        <input
          type="datetime-local"
          value={reminderAt}
          onChange={(e) => setReminderAt(e.target.value)}
          className="w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        />
        <p className="mb-4 mt-1.5 text-[11px] text-faint">{t("task_reminder_hint")}</p>

        {error && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg border border-cyan/40 bg-cyanDim/40 py-2.5 text-sm font-medium text-cyan transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? t("creating") : t("create")}
        </button>
      </form>
    </div>
  );
}

function TransferModal({
  users,
  onClose,
  onSubmit,
}: {
  users: AssignableUser[];
  onClose: () => void;
  onSubmit: (toUserId: string, note: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [toUserId, setToUserId] = useState(users[0]?.id || "");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!toUserId) return;
    setLoading(true);
    await onSubmit(toUserId, note);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm px-4 py-8">
      <form onSubmit={submit} className="panel w-full max-w-sm p-6 animate-rise">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">{t("transfer_task_title")}</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>

        <label className="mb-1 block label-eyebrow">{t("transfer_to_label")}</label>
        <select
          value={toUserId}
          onChange={(e) => setToUserId(e.target.value)}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} · {t(ROLE_LABEL_KEYS[u.role])}
            </option>
          ))}
        </select>

        <label className="mb-1 block label-eyebrow">{t("optional")}</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder={t("transfer_note_placeholder")}
          className="mb-4 w-full resize-none rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        />

        <button
          type="submit"
          disabled={loading || !toUserId}
          className="w-full rounded-lg border border-violet/40 bg-violetDim/40 py-2.5 text-sm font-medium text-violet transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? t("saving") : t("transfer_confirm_btn")}
        </button>
      </form>
    </div>
  );
}
