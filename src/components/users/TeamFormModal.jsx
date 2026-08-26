import { useEffect, useState } from "react";
import { Button, Input, Modal, Select } from "../ui";

const emptyTeam = { name: "", status: "Standby", location: "" };
const statuses = ["Deployed", "Standby", "Offline"];

export default function TeamFormModal({ isOpen, onClose, onSave }) {
  const [form, setForm] = useState(emptyTeam);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(emptyTeam);
    setError("");
    setSaving(false);
  }, [isOpen]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  async function submit(event) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setError("Team name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({ name, status: form.status, location: form.location.trim() });
      onClose();
    } catch (saveError) {
      setError(saveError?.message || "Unable to add the team.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Team" persistent={saving}>
      <form onSubmit={submit}>
        <Input label="Team Name" value={form.name} onChange={(event) => update("name", event.target.value)} maxLength={100} required autoFocus />
        <Select label="Status" value={form.status} onChange={(event) => update("status", event.target.value)} options={statuses.map((status) => ({ value: status, label: status }))} />
        <Input label="Location" value={form.location} onChange={(event) => update("location", event.target.value)} maxLength={120} />
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" loading={saving}>Add Team</Button>
        </div>
      </form>
    </Modal>
  );
}
