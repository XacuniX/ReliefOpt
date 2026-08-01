import { useMemo, useState } from "react";
import RoleGate from "../components/RoleGate";
import { Button, Input, Select, Toast } from "../components/ui";
import { users as mockUsers } from "../mockData";
import UserFormModal from "../components/users/UserFormModal";
import UserTable from "../components/users/UserTable";
import TeamPanel from "../components/users/TeamPanel";

function UsersContent() {
  const [users, setUsers] = useState(mockUsers);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState("");
  const filteredUsers = useMemo(() => users.filter((user) => (!role || user.role === role) && user.name.toLowerCase().includes(search.trim().toLowerCase())), [users, search, role]);
  function saveUser(user) { setUsers((current) => user.id ? current.map((entry) => entry.id === user.id ? { ...entry, ...user } : entry) : [...current, { ...user, id: `u${Date.now()}`, lastLogin: new Date().toISOString() }]); setToast("User saved successfully."); }
  function deactivate(user) { setUsers((current) => current.map((entry) => entry.id === user.id ? { ...entry, status: "Inactive" } : entry)); setToast(`${user.name} has been deactivated.`); }
  return <main style={{ maxWidth: 1280, margin: "0 auto" }}><div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}><h1 style={{ fontSize: 28 }}>Users</h1><Button onClick={() => { setEditingUser(null); setModalOpen(true); }}>+ Add User</Button></div><div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}><Input label="Search users" placeholder="Search by name" value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: "1 1 240px", marginBottom: 0 }} /><Select label="Role" value={role} onChange={(e) => setRole(e.target.value)} style={{ flex: "1 1 220px", marginBottom: 0 }} options={[{ value: "", label: "All roles" }, ...["central_admin", "warehouse_manager", "field_worker"].map((value) => ({ value, label: value.replaceAll("_", " ") }))]} /></div><UserTable users={filteredUsers} onEdit={(user) => { setEditingUser(user); setModalOpen(true); }} onDeactivate={deactivate} /><TeamPanel userList={users} /><UserFormModal isOpen={modalOpen} user={editingUser} onClose={() => setModalOpen(false)} onSave={saveUser} />{toast && <Toast type="success" message={toast} onDismiss={() => setToast("")} />}</main>;
}

export default function UsersPage() { return <RoleGate allowed={["central_admin"]}><UsersContent /></RoleGate>; }
