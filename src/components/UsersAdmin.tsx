"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_LABELS, Role } from "@/lib/roles";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
};

export function UsersAdmin({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const router = useRouter();
  const [list, setList] = useState(users);
  const [formOpen, setFormOpen] = useState(false);

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
    if (!confirm("Удалить этого пользователя?")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setList((prev) => prev.filter((u) => u.id !== id));
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Не удалось удалить");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="label-eyebrow mb-1">управление доступом</div>
          <h1 className="font-display text-2xl font-semibold text-ink">Пользователи</h1>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="rounded-lg border border-cyan/40 bg-cyanDim/40 px-4 py-2.5 text-sm font-medium text-cyan shadow-glowCyan transition-opacity hover:opacity-90"
        >
          + Новый пользователь
        </button>
      </div>

      <div className="panel overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="px-5 py-3 font-normal label-eyebrow">Имя</th>
              <th className="px-5 py-3 font-normal label-eyebrow">Почта</th>
              <th className="px-5 py-3 font-normal label-eyebrow">Роль</th>
              <th className="px-5 py-3 font-normal label-eyebrow"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id} className="border-b border-line/60 last:border-0">
                <td className="px-5 py-3 text-ink">{u.name}</td>
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
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-5 py-3 text-right">
                  {u.id !== currentUserId && (
                    <button
                      onClick={() => removeUser(u.id)}
                      className="text-xs text-muted transition-colors hover:text-danger"
                    >
                      Удалить
                    </button>
                  )}
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
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("VIEWER");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password, role }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Не удалось создать");
      return;
    }
    const user = await res.json();
    onCreated(user);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <form onSubmit={submit} className="panel w-full max-w-sm p-6 animate-rise">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Новый пользователь</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>

        <label className="mb-1 block label-eyebrow">Имя</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        />

        <label className="mb-1 block label-eyebrow">Почта</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        />

        <label className="mb-1 block label-eyebrow">Пароль (мин. 8 символов)</label>
        <input
          required
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        />

        <label className="mb-1 block label-eyebrow">Роль</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="mb-5 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        >
          {(["ADMIN", "MANAGER", "VIEWER"] as const).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>

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
          {loading ? "Создание…" : "Создать"}
        </button>
      </form>
    </div>
  );
}
