import { useEffect, useMemo, useState } from "react";
import { AppFrame } from "@/components/platform/AppFrame";
import { adminNav } from "../roleNav";
import { useAuth } from "@/auth/AuthContext";
import { changeUserRole, getAdminUsers, type BackendUser } from "@/lib/user-api";

export default function AdminUsersPage() {
  const { user } = useAuth();
  const token = user?.accessToken;

  const [search, setSearch] = useState("");
  const [role, setRole] = useState<string>(""); // "student" | "instructor" | "admin"
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [users, setUsers] = useState<BackendUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);

    getAdminUsers(token, {
      role: role || undefined,
      search: search || undefined,
      page,
      limit,
    })
      .then((res) => {
        setUsers(res.users);
        setTotal(res.total);
        setPage(res.page);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load users"))
      .finally(() => setLoading(false));
  }, [token, role, search, page, limit]);

  const onChangeRole = async (userId: string, nextRole: BackendUser["role"]) => {
    if (!token) return;
    setError(null);
    try {
      await changeUserRole(token, userId, nextRole);
      // Minimal: refetch current page after role update.
      const res = await getAdminUsers(token, { role: role || undefined, search: search || undefined, page, limit });
      setUsers(res.users);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  return (
    <AppFrame
      roleLabel="Admin"
      title="User Management"
      subtitle="Search, filter, and manage user access across the platform."
      navItems={adminNav}
    >
      <section className="dei-card p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 flex-1 rounded-xl bg-muted/40 px-3 outline-none ring-primary/30 focus:ring-2"
            placeholder="Search name or email"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-10 rounded-xl bg-muted/40 px-3 text-sm outline-none ring-primary/30 focus:ring-2"
          >
            <option value="">All roles</option>
            <option value="student">Student</option>
            <option value="instructor">Instructor</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {error && <p className="text-sm text-destructive mb-3">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-muted-foreground">
                <th className="pb-3">Name</th>
                <th className="pb-3">Email</th>
                <th className="pb-3">Role</th>
                <th className="pb-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-4 text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} className="border-b border-border/40">
                    <td className="py-3 font-medium text-foreground">{u.fullname}</td>
                    <td className="py-3 text-muted-foreground">{u.email}</td>
                    <td className="py-3">
                      <select
                        value={u.role}
                        onChange={(e) => onChangeRole(u._id, e.target.value as BackendUser["role"])}
                        className="h-9 rounded-lg bg-muted/40 px-2 text-sm outline-none ring-primary/30 focus:ring-2"
                      >
                        <option value="student">student</option>
                        <option value="instructor">instructor</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="h-9 px-3 rounded-xl bg-muted/40 text-sm outline-none ring-primary/30 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="h-9 px-3 rounded-xl bg-muted/40 text-sm outline-none ring-primary/30 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </section>
    </AppFrame>
  );
}
