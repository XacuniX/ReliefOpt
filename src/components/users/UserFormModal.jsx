import { useEffect, useState } from "react";
import { Button, Input, Modal, Select } from "../ui";
import { teams } from "../../mockData";

const emptyUser = { name: "", username: "", role: "field_worker", team: "", phone: "", status: "Active" };
const roles = ["central_admin", "warehouse_manager", "field_worker"];
const assignmentOptions = ["", ...teams.map((team) => team.name), "Warehouse A", "Warehouse B", "Warehouse C", "Warehouse D", "Warehouse E"];

export default function UserFormModal({ isOpen, user, onClose, onSave }) {
  const [form, setForm] = useState(emptyUser);
  const [initialRole, setInitialRole] = useState(emptyUser.role);

  useEffect(() => {
    if (isOpen) {
      const next = user ? { ...emptyUser, ...user, username: user.username || user.name.toLowerCase().replace(/\s+/g, ".") } : emptyUser;
      setForm(next);
      setInitialRole(next.role);
    }
  }, [isOpen, user]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  function submit(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.username.trim()) return;
    onSave({ ...form, name: form.name.trim(), username: form.username.trim() });
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={user ? "Edit User" : "Add User"}>
      <form onSubmit={submit}>
        <Input label="Full Name" value={form.name} onChange={(e) => update("name", e.target.value)} />
        <Input label="Username" value={form.username} onChange={(e) => update("username", e.target.value)} />
        <Select label="Role" value={form.role} onChange={(e) => update("role", e.target.value)} options={roles.map((role) => ({ value: role, label: role.replace(/_/g, " ") }))} />
        {form.role !== initialRole && (
          <p role="alert" className="bg-amber-500/15 rounded-md text-amber-700 dark:text-amber-400 text-[13px] -mt-2 mb-4 p-2.5">
            Changing role will update access permissions
          </p>
        )}
        <Select label="Assigned Team/Warehouse" value={form.team} onChange={(e) => update("team", e.target.value)} options={assignmentOptions.map((value) => ({ value, label: value || "Unassigned" }))} />
        <Input label="Phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
        <label className="flex items-center gap-2 mb-5 text-sm">
          <input type="checkbox" checked={form.status === "Active"} onChange={(e) => update("status", e.target.checked ? "Active" : "Inactive")} className="accent-primary" />
          Active
        </label>
        <div className="flex justify-end">
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
}
