"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_LABEL_KEYS, Role } from "@/lib/roles";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: Role;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  position?: string | null;
  city?: string | null;
  createdAt: string;
};

export function UsersAdmin({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [list, setList] = useState(users);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);

  async function updateRole(id: string, role: Role) {
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      const updated = await res.json();
      setList((prev) => prev.map((u) => (u.id === id ? updated : u)));
    }
  }

  async function removeUser(id: string) {
    if (!confirm(t("delete_user_confirm"))) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setList((prev) => prev.filter((u) => u.id !== id));
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || t("delete_failed"));
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="label-eyebrow mb-1">{t("users_eyebrow")}</div>
          <h1 className="font-display text-2xl font-semibold text-ink">{t("users_title")}</h1>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="rounded-lg border border-cyan/40 bg-cyanDim/40 px-4 py-2.5 text-sm font-medium text-cyan shadow-glowCyan transition-opacity hover:opacity-90"
        >
          {t("new_user_btn")}
        </button>
      </div>

      <div className="panel overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="px-5 py-3 font-normal label-eyebrow">{t("col_name")}</th>
              <th className="px-5 py-3 font-normal label-eyebrow">{t("col_email")}</th>
              <th className="px-5 py-3 font-normal label-eyebrow">{t("col_role")}</th>
              <th className="px-5 py-3 font-normal label-eyebrow"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id} className="border-b border-line/60 last:border-0">
                <td className="px-5 py-3 text-ink">
                  <button
                    onClick={() => setEditing(u)}
                    className="text-left text-ink transition-colors hover:text-cyan"
                  >
                    {u.name}
                  </button>
                </td>
                <td className="px-5 py-3 font-mono text-xs text-muted">{u.email}</td>
                <td className="px-5 py-3">
                  <select
                    value={u.role}
                    disabled={u.id === currentUserId}
                    onChange={(e) => updateRole(u.id, e.target.value as Role)}
                    className="rounded-md border border-line bg-bg2 px-2 py-1 text-xs text-ink outline-none disabled:opacity-50"
                  >
                    {(["ADMIN", "MANAGER", "VIEWER"] as const).map((r) => (
                      <option key={r} value={r}>
                        {t(ROLE_LABEL_KEYS[r])}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => setEditing(u)}
                      className="text-xs text-muted transition-colors hover:text-ink"
                    >
                      {t("edit_action")}
                    </button>
                    {u.id !== currentUserId && (
                      <button
                        onClick={() => removeUser(u.id)}
                        className="text-xs text-muted transition-colors hover:text-danger"
                      >
                        {t("delete_action")}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <NewUserModal
          onClose={() => setFormOpen(false)}
          onCreated={(u) => {
            setList((prev) => [...prev, u]);
            setFormOpen(false);
            router.refresh();
          }}
        />
      )}

      {editing && (
        <EditUserModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={(u) => {
            setList((prev) => prev.map((x) => (x.id === u.id ? u : x)));
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function NewUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (u: UserRow) => void;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("VIEWER");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password, role, firstName, lastName, phone, position, city }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || t("create_failed"));
      return;
    }
    const user = await res.json();
    onCreated(user);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm px-4 py-8">
      <form onSubmit={submit} className="panel w-full max-w-sm p-6 animate-rise">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">{t("new_user_title")}</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>

        <label className="mb-1 block label-eyebrow">{t("field_full_name")}</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        />

        <label className="mb-1 block label-eyebrow">{t("field_email")}</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        />

        <label className="mb-1 block label-eyebrow">{t("field_password")}</label>
        <input
          required
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        />

        <label className="mb-1 block label-eyebrow">{t("field_role")}</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        >
          {(["ADMIN", "MANAGER", "VIEWER"] as const).map((r) => (
            <option key={r} value={r}>
              {t(ROLE_LABEL_KEYS[r])}
            </option>
          ))}
        </select>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block label-eyebrow">{t("field_first_name")}</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={t("first_name_placeholder")}
              className="w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
            />
          </div>
          <div>
            <label className="mb-1 block label-eyebrow">{t("field_last_name")}</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={t("last_name_placeholder")}
              className="w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
            />
          </div>
        </div>

        <label className="mb-1 block label-eyebrow">{t("field_phone")}</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t("phone_placeholder")}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        />

        <div className="mb-5 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block label-eyebrow">{t("field_position")}</label>
            <input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder={t("position_placeholder")}
              className="w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
            />
          </div>
          <div>
            <label className="mb-1 block label-eyebrow">{t("field_city")}</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={t("city_placeholder")}
              className="w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
            />
          </div>
        </div>

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

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: UserRow;
  onClose: () => void;
  onSaved: (u: UserRow) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<Role>(user.role);
  const [firstName, setFirstName] = useState(user.firstName || "");
  const [lastName, setLastName] = useState(user.lastName || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [position, setPosition] = useState(user.position || "");
  const [city, setCity] = useState(user.city || "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, role, firstName, lastName, phone, position, city }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || t("save_failed"));
      return;
    }
    const updated = await res.json();
    onSaved(updated);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm px-4 py-8">
      <form onSubmit={submit} className="panel w-full max-w-sm p-6 animate-rise">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">{t("edit_user_title")}</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>

        <label className="mb-1 block label-eyebrow">{t("field_full_name")}</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        />

        <label className="mb-1 block label-eyebrow">{t("field_email")}</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        />

        <label className="mb-1 block label-eyebrow">{t("field_role")}</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        >
          {(["ADMIN", "MANAGER", "VIEWER"] as const).map((r) => (
            <option key={r} value={r}>
              {t(ROLE_LABEL_KEYS[r])}
            </option>
          ))}
        </select>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block label-eyebrow">{t("field_first_name")}</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={t("first_name_placeholder")}
              className="w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
            />
          </div>
          <div>
            <label className="mb-1 block label-eyebrow">{t("field_last_name")}</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={t("last_name_placeholder")}
              className="w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
            />
          </div>
        </div>

        <label className="mb-1 block label-eyebrow">{t("field_phone")}</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t("phone_placeholder")}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        />

        <div className="mb-5 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block label-eyebrow">{t("field_position")}</label>
            <input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder={t("position_placeholder")}
              className="w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
            />
          </div>
          <div>
            <label className="mb-1 block label-eyebrow">{t("field_city")}</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={t("city_placeholder")}
              className="w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
            />
          </div>
        </div>

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
          {loading ? t("saving") : t("save_changes")}
        </button>
      </form>
    </div>
  );
}
