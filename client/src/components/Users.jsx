import { useState, useEffect, useRef } from "react";
import { Formik, Form } from "formik";
import { API_BASE } from "../config";
import { gsap } from "gsap";
import { useShake } from "../hooks/useAnimations";
import { usePermissions } from "../hooks/usePermissions";
import AnimatedLoader from "./AnimatedLoader";
import FormikField from "./FormikField";
import { userSchema } from "../validations/schemas";

export default function Users({ currentUser }) {
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const tableRef = useRef(null);
  const [deleteButtonRef, shakeDelete] = useShake();

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

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      const url = editingUser
        ? `${API_BASE}/users/${editingUser.id}`
        : `${API_BASE}/users`;

      const method = editingUser ? "PATCH" : "POST";
      // When creating, include password set by admin
      const body = editingUser
        ? { name: values.name, phone: values.phone, role: values.role }
        : { name: values.name, email: values.email, password: values.password, phone: values.phone, role: values.role };

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
      
      const result = await res.json();

      resetForm();
      setShowForm(false);
      setEditingUser(null);
      fetchUsers();
      
      // Show success message with invitation info
      if (!editingUser && result.message) {
        alert(result.message);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
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

  const deleteUser = async (user) => {
    const confirmed = window.confirm(
      `⚠️ PERMANENTLY DELETE ${user.name || user.email}?\n\nThis cannot be undone. If the user has associated records, consider deactivating instead.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/users/${user.id}`, {
        method: "DELETE",
        headers: { "x-user-id": currentUser?.id },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete user");
      alert(data.message || "User deleted");
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const resetUserPassword = async (user) => {
    // Prompt for new password
    const newPassword = window.prompt(
      `Reset password for ${user.name || user.email}\n\nEnter new password (min 6 characters):`
    );
    
    if (!newPassword) return; // User cancelled
    
    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }
    
    const confirmed = window.confirm(
      `Are you sure you want to set this new password for ${user.name || user.email}?\n\nShare this password securely with them.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/users/${user.id}/reset-password`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": currentUser?.id 
        },
        body: JSON.stringify({ newPassword })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to reset password");
      }
      
      const result = await res.json();
      alert(result.message || "Password reset successfully!");
    } catch (err) {
      alert(err.message);
    }
  };

  const startEdit = (user) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditingUser(null);
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

  // Animate table rows when filtered users change
  useEffect(() => {
    if (tableRef.current && !loading && filteredUsers.length > 0) {
      const rows = tableRef.current.querySelectorAll("tbody tr");
      gsap.fromTo(
        rows,
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, duration: 0.3, stagger: 0.03, ease: "power2.out" }
      );
    }
  }, [filteredUsers.length, loading]);

  // Initial form values
  const getInitialValues = () => {
    if (editingUser) {
      return {
        name: editingUser.name,
        email: editingUser.email,
        phone: editingUser.phone || "",
        role: editingUser.role,
      };
    }
    return {
      name: "",
      email: "",
      password: "",
      phone: "",
      role: "staff",
    };
  };

  if (loading) return <AnimatedLoader message="Loading users..." />;
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
          {hasPermission('users', 'create') && (
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
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                marginTop: "0.5rem",
              }}
            >
              Showing {filteredUsers.length} of {users.length} users
            </p>
          )}
        </div>

        {showForm && (hasPermission('users', 'create') || hasPermission('users', 'edit')) && (
            <Formik
              initialValues={getInitialValues()}
              validationSchema={userSchema}
              validateOnChange={true}
              validateOnBlur={true}
              context={{ isEditing: !!editingUser }}
              onSubmit={handleSubmit}
            >
              {({ isSubmitting, values, handleChange }) => (
                <Form
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
                    <FormikField
                      label="Name"
                      name="name"
                      placeholder="Full name"
                      required
                    />
                    {!editingUser && (
                      <>
                        <FormikField
                          label="Email"
                          name="email"
                          type="email"
                          placeholder="email@example.com"
                          required
                        />
                        <FormikField
                          label="Password"
                          name="password"
                          type="password"
                          placeholder="Set user password"
                          required
                        />
                        <div style={{ 
                          padding: '0.75rem', 
                          background: 'rgba(243, 156, 18, 0.15)', 
                          borderRadius: '4px',
                          marginBottom: '1rem',
                          fontSize: '0.9rem',
                          color: 'var(--accent-warning)',
                          gridColumn: '1 / -1'
                        }}>
                          ⚠️ Set a password for the user. Share it securely with them.
                        </div>
                      </>
                    )}
                    <FormikField
                      label="Phone"
                      name="phone"
                      placeholder="e.g. 0722123456"
                    />
                    <div className="form-group">
                      <label
                        style={{
                          display: "block",
                          marginBottom: "0.35rem",
                          fontWeight: 500,
                          fontSize: "0.8rem",
                          color: "var(--text-primary)",
                        }}
                      >
                        Role <span style={{ color: "#dc3545" }}>*</span>
                      </label>
                      <select
                        name="role"
                        value={values.role}
                        onChange={handleChange}
                        style={{
                          width: "100%",
                          padding: "0.5rem 0.75rem",
                          border: "1px solid var(--border-color)",
                          borderRadius: "6px",
                          fontSize: "0.85rem",
                          background: "var(--bg-secondary)",
                          color: "var(--text-primary)",
                        }}
                        required
                      >
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                        <option value="finance">Finance</option>
                        <option value="driver">Driver</option>
                        {isSuperAdmin && (
                          <option value="superadmin">Super Admin</option>
                        )}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="submit"
                      className="btn btn-success"
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? "Saving..."
                        : editingUser
                        ? "Update User"
                        : "Add User"}
                    </button>
                    {editingUser && (
                      <button
                        type="button"
                        className="btn"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </Form>
              )}
            </Formik>
          )}

        <table ref={tableRef}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              {(hasPermission('users', 'edit') || hasPermission('users', 'delete')) && <th>Actions</th>}
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
                    className={`badge ${
                      user.is_active ? "available" : "maintenance"
                    }`}
                  >
                    {user.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                {(hasPermission('users', 'edit') || hasPermission('users', 'delete') || isSuperAdmin) && (
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {hasPermission('users', 'edit') && (
                        <button
                          className="btn btn-small"
                          onClick={() => startEdit(user)}
                          title="Edit user"
                        >
                          ✏️
                        </button>
                      )}
                      {/* Only SuperAdmin can reset passwords */}
                      {isSuperAdmin && user.id !== currentUser?.id && (
                        <button
                          className="btn btn-small btn-warning"
                          onClick={() => resetUserPassword(user)}
                          title="Set new password for user"
                          style={{ background: '#ff9800', color: 'white' }}
                        >
                          🔑
                        </button>
                      )}
                      {hasPermission('users', 'delete') && user.id !== currentUser?.id && (
                        <button
                          ref={deleteButtonRef}
                          className={`btn btn-small ${
                            user.is_active ? "btn-danger" : "btn-success"
                          }`}
                          onClick={() => {
                            if (user.is_active) {
                              const confirmed = window.confirm(
                                "Are you sure you want to deactivate this user?"
                              );
                              if (confirmed) {
                                toggleUserStatus(user.id);
                              } else {
                                shakeDelete();
                              }
                            } else {
                              toggleUserStatus(user.id);
                            }
                          }}
                          title={
                            user.is_active ? "Deactivate user" : "Activate user"
                          }
                        >
                          {user.is_active ? "🚫" : "✅"}
                        </button>
                      )}
                      {isSuperAdmin && user.id !== currentUser?.id && (
                        <button
                          className="btn btn-small btn-danger"
                          onClick={() => deleteUser(user)}
                          title="Permanently delete user"
                        >
                          🗑️
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
          <p
            style={{
              textAlign: "center",
              padding: "2rem",
              color: "var(--text-muted)",
            }}
          >
            {searchQuery ? "No users match your search" : "No users found"}
          </p>
        )}
      </div>
    </div>
  );
}
