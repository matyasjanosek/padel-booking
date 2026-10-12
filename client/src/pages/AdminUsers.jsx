import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchAdminUsers, changeUserRole } from "../api/adminUsers.js";

const ROLE_LABELS = { member: "Member", admin: "Admin" };

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState("");
  // Picking a new role only arms the Save button, it does not save on its
  // own, so a misclick on the select cannot change someone's role by itself.
  const [roleDrafts, setRoleDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    fetchAdminUsers()
      .then(setUsers)
      .catch((err) => setError(err.message));
  }, []);

  function handleRoleSelect(id, role) {
    setRoleDrafts((current) => ({ ...current, [id]: role }));
  }

  async function handleSave(id) {
    setSavingId(id);
    setError("");
    try {
      const updated = await changeUserRole(id, roleDrafts[id]);
      setUsers((current) => current.map((user) => (user.id === id ? updated : user)));
      setRoleDrafts((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="px-5 py-12 md:max-w-page md:pl-24 md:pr-10 md:py-16">
      <h1 className="mb-4 text-4xl tracking-tight md:text-5xl">Users</h1>
      <p className="mb-8 max-w-[60ch] text-text-muted">All registered members and admins.</p>

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {users === null ? (
        <p className="text-text-muted">Loading users...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border text-sm text-text-muted">
                <th className="py-2 pr-3 font-normal">Name</th>
                <th className="py-2 pr-3 font-normal">Email</th>
                <th className="py-2 pr-3 font-normal">Role</th>
                <th className="py-2 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = user.id === currentUser.id;
                const draftRole = roleDrafts[user.id];
                return (
                  <tr key={user.id} className="border-b border-border/60">
                    <td className="py-3 pr-3 text-text">{user.name}</td>
                    <td className="py-3 pr-3 text-text">{user.email}</td>
                    <td className="py-3 pr-3 text-text">
                      {isSelf ? (
                        ROLE_LABELS[user.role]
                      ) : (
                        <select
                          value={draftRole ?? user.role}
                          onChange={(event) => handleRoleSelect(user.id, event.target.value)}
                          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-text"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                    </td>
                    <td className="py-3">
                      {isSelf ? (
                        <span className="text-sm text-text-muted">
                          You cannot change your own role
                        </span>
                      ) : (
                        draftRole &&
                        draftRole !== user.role && (
                          <button
                            type="button"
                            onClick={() => handleSave(user.id)}
                            disabled={savingId === user.id}
                            className="rounded-full border border-accent bg-accent px-4 py-1.5 text-sm font-medium text-bg disabled:opacity-50"
                          >
                            {savingId === user.id ? "Saving..." : "Save"}
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
