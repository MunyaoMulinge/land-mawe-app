import { useState, useEffect } from "react";
import { API_BASE } from "../config";

export default function Users({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "staff",
  });
  const [searchQuery, setSearchQuery] = useState("");

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/users`, {
        headers: { "x-user-id": currentUser?.id },
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingUser
        ? `${API_BASE}/users/${editingUser.id}`
        : `${API_BASE}/users`;

      const method = editingUser ? "PATCH" : "POST";
      const body = editingUser
        ? { name: form.name, phone: form.phone, role: form.role }
        : form;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser?.id,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save user");
      }

      setForm({ name: "", email: "", password: "", phone: "", role: "staff" });
      setShowForm(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleUserStatus = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/toggle-active`, {
        method: "PATCH",
        headers: { "x-user-id": currentUser?.id },
      });
      if (!res.ok) throw new Error("Failed to update user status");
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const startEdit = (user) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      phone: user.phone || "",
      role: user.role,
    });
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setForm({ name: "", email: "", password: "", phone: "", role: "staff" });
    setShowForm(false);
  };

  // Filter users based on search query
  const filteredUsers = users.filter((user) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.phone?.toLowerCase().includes(query) ||
      user.role?.toLowerCase().includes(query)
    );
  });

  if (loading) return <div className="loading">Loading users...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div>
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h2>👥 User Management</h2>
          {(currentUser?.role === "admin" ||
            currentUser?.role === "superadmin") && (
            <button
              className="btn btn-primary"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? "Cancel" : "+ Add User"}
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", maxWidth: "400px" }}>
            <input
              type="text"
              placeholder="Search by name, email, phone or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                padding: "0.5rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
              }}
            />
            {searchQuery && (
              <button
                className="btn"
                onClick={() => setSearchQuery("")}
                title="Clear search"
              >
                ✕
              </button>
            )}
            <button className="btn btn-primary" onClick={() => {}}>
              🔍 Search
            </button>
          </div>
          {searchQuery && (
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
              Showing {filteredUsers.length} of {users.length} users
            </p>
          )}
        </div>

        {showForm &&
          (currentUser?.role === "admin" ||
            currentUser?.role === "superadmin") && (
            <form
              onSubmit={handleSubmit}
              style={{
                marginBottom: "1.5rem",
                padding: "1rem",
                background: "var(--bg-tertiary)",
                borderRadius: "8px",
              }}
            >
              <h3 style={{ marginBottom: "1rem" }}>
                {editingUser ? "Edit User" : "Add New User"}
              </h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                {!editingUser && (
                  <>
                    <div className="form-group">
                      <label>Email *</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Password *</label>
                      <input
                        type="password"
                        value={form.password}
                        onChange={(e) =>
                          setForm({ ...form, password: e.target.value })
                        }
                        required
                        minLength={6}
                      />
                    </div>
                  </>
                )}
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    placeholder="e.g. 0722123456"
                  />
                </div>
                <div className="form-group">
                  <label>Role *</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                    <option value="finance">Finance</option>
                    <option value="driver">Driver</option>
                    {currentUser?.role === "superadmin" && (
                      <option value="superadmin">Super Admin</option>
                    )}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="submit" className="btn btn-success">
                  {editingUser ? "Update User" : "Add User"}
                </button>
                {editingUser && (
                  <button type="button" className="btn" onClick={cancelEdit}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              {(currentUser?.role === "admin" ||
                currentUser?.role === "superadmin") && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} style={{ opacity: user.is_active ? 1 : 0.5 }}>
                <td>
                  {user.name}
                  {user.id === currentUser?.id && (
                    <span
                      style={{
                        marginLeft: "0.5rem",
                        fontSize: "0.8em",
                        color: "#666",
                      }}
                    >
                      (You)
                    </span>
                  )}
                </td>
                <td>{user.email}</td>
                <td>{user.phone || "-"}</td>
                <td>
                  <span
                    className={`badge ${
                      user.role === "superadmin"
                        ? "admin"
                        : user.role === "admin"
                          ? "admin"
                          : user.role === "finance"
                            ? "available"
                            : user.role === "driver"
                              ? "in-use"
                              : "staff"
                    }`}
                  >
                    {user.role === "superadmin"
                      ? "⭐ Super Admin"
                      : user.role === "admin"
                        ? "👑 Admin"
                        : user.role === "finance"
                          ? "💰 Finance"
                          : user.role === "driver"
                            ? "🚗 Driver"
                            : "👤 Staff"}
                  </span>
                </td>
                <td>
                  <span
                    className={`badge ${user.is_active ? "available" : "maintenance"}`}
                  >
                    {user.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                {(currentUser?.role === "admin" ||
                  currentUser?.role === "superadmin") && (
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        className="btn btn-small"
                        onClick={() => startEdit(user)}
                        title="Edit user"
                      >
                        ✏️
                      </button>
                      {user.id !== currentUser?.id && (
                        <button
                          className={`btn btn-small ${user.is_active ? "btn-danger" : "btn-success"}`}
                          onClick={() => toggleUserStatus(user.id)}
                          title={
                            user.is_active ? "Deactivate user" : "Activate user"
                          }
                        >
                          {user.is_active ? "🚫" : "✅"}
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <p style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
            {searchQuery ? "No users match your search" : "No users found"}
          </p>
        )}
      </div>
    </div>
  );
}
