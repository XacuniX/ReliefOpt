import { useEffect, useState } from "react";
import { Button, Input, Modal, Select } from "../ui";

const emptyUser = {
  name: "",
  username: "",
  role: "field_worker",
  teamId: "",
  phone: "",
  status: "Active",
  password: "",
  confirmPassword: "",
};
const roles = ["central_admin", "warehouse_manager", "field_worker"];

export default function UserFormModal({
  isOpen,
  user,
  teams = [],
  currentUserId,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(emptyUser);
  const [initialRole, setInitialRole] = useState(emptyUser.role);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const editingSelf = Boolean(user && user.id === currentUserId);

  useEffect(() => {
    if (!isOpen) return;
    const next = user
      ? {
          ...emptyUser,
          ...user,
          teamId: user.teamId || "",
          password: "",
          confirmPassword: "",
        }
      : { ...emptyUser };
    setForm(next);
    setInitialRole(next.role);
    setError("");
    setSaving(false);
  }, [isOpen, user]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!form.name.trim() || !form.username.trim()) {
      setError("Full name and username are required.");
      return;
    }
    if ((!user || form.password) && form.password.length < 12) {
      setError("Password must contain at least 12 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Password confirmation does not match.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...(user ? { id: user.id } : {}),
        name: form.name.trim(),
        username: form.username.trim(),
        role: form.role,
        teamId: form.teamId || null,
        phone: form.phone.trim(),
        status: form.status,
        ...(form.password ? { password: form.password } : {}),
      };
      await onSave(payload);
      onClose();
    } catch (saveError) {
      setError(saveError?.message || "Unable to save the user.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={user ? "Edit User" : "Add User"} persistent={saving}>
      <form onSubmit={submit}>
        <Input label="Full Name" value={form.name} onChange={(event) => update("name", event.target.value)} required />
        <Input label="Username" value={form.username} onChange={(event) => update("username", event.target.value)} autoCapitalize="none" autoComplete="off" required />
        <Select
          label="Role"
          value={form.role}
          onChange={(event) => update("role", event.target.value)}
          options={roles.map((role) => ({ value: role, label: role.replace(/_/g, " ") }))}
          disabled={editingSelf}
        />
        {form.role !== initialRole && (
          <p role="alert" className="bg-amber-500/15 rounded-md text-amber-700 dark:text-amber-400 text-[13px] -mt-2 mb-4 p-2.5">
            Changing role updates authorization on the user&apos;s next request.
          </p>
        )}
        <Select
          label="Assigned Team"
          value={form.teamId}
          onChange={(event) => update("teamId", event.target.value)}
          options={[
            { value: "", label: "Unassigned" },
            ...teams.map((team) => ({ value: team.id, label: team.name })),
          ]}
        />
        <Input label="Phone" value={form.phone} onChange={(event) => update("phone", event.target.value)} type="tel" />
        <Input
          label={user ? "New Password (optional)" : "Temporary Password"}
          value={form.password}
          onChange={(event) => update("password", event.target.value)}
          type="password"
          minLength={12}
          autoComplete="new-password"
          required={!user}
        />
        <Input
          label="Confirm Password"
          value={form.confirmPassword}
          onChange={(event) => update("confirmPassword", event.target.value)}
          type="password"
          minLength={12}
          autoComplete="new-password"
          required={!user || Boolean(form.password)}
        />
        {editingSelf && form.password && (
          <p className="text-sm text-amber-700 dark:text-amber-400 -mt-2 mb-4">
            Changing your own password signs out this session.
          </p>
        )}
        <label className="flex items-center gap-2 mb-5 text-sm">
          <input
            type="checkbox"
            checked={form.status === "Active"}
            onChange={(event) => update("status", event.target.checked ? "Active" : "Inactive")}
            disabled={editingSelf}
            className="accent-primary"
          />
          Active
        </label>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit" loading={saving}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}
