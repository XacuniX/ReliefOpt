import { useState } from "react";
import { Button, Input, Modal, Select, Textarea } from "../ui";

const emptyForm = {
  title: "", description: "", priority: "Medium", assignedTeamId: "", assignedUserId: "",
  dueDate: "", dueTime: "", linkedReportId: "",
  resources: { vehicle: false, medicalKit: false, communicationDevice: false },
};

export default function CreateTaskModal({ isOpen, onClose, onCreate, teams = [], users = [], reports = [] }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const openReports = reports.filter((report) => report.status !== "Resolved");
  const eligibleUsers = users.filter((user) => user.status !== "Inactive"
    && (!form.assignedTeamId || user.teamId === form.assignedTeamId));
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  async function submit(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.assignedTeamId || !form.dueDate || !form.dueTime) return;
    setSaving(true);
    setError("");
    try {
      await onCreate({
        id: crypto.randomUUID(),
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        assignedTeamId: form.assignedTeamId,
        assignedUserId: form.assignedUserId || null,
        dueTime: new Date(`${form.dueDate}T${form.dueTime}`).toISOString(),
        linkedReportId: form.linkedReportId || null,
        resources: form.resources,
        updates: [],
        status: "To Do",
      });
      setForm(emptyForm);
      onClose();
    } catch (saveError) {
      setError(saveError.message || "Unable to create the task.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Task" persistent={saving}>
      <form onSubmit={submit}>
        <Input label="Task Title" value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Enter task title" required />
        <Textarea label="Description" value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Describe the task" rows={3} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Priority" value={form.priority} onChange={(event) => update("priority", event.target.value)} options={["Critical", "High", "Medium", "Low"].map((value) => ({ value, label: value }))} />
          <Select
            label="Assign Team"
            value={form.assignedTeamId}
            onChange={(event) => setForm((current) => ({ ...current, assignedTeamId: event.target.value, assignedUserId: "" }))}
            options={[{ value: "", label: "Select a team" }, ...teams.map((team) => ({ value: team.id, label: team.name }))]}
          />
          <Select
            label="Assign Field Worker"
            value={form.assignedUserId}
            onChange={(event) => update("assignedUserId", event.target.value)}
            options={[{ value: "", label: "Team only" }, ...eligibleUsers.map((user) => ({ value: user.id, label: user.name }))]}
          />
          <span />
          <Input label="Due Date" type="date" value={form.dueDate} onChange={(event) => update("dueDate", event.target.value)} required />
          <Input label="Due Time" type="time" value={form.dueTime} onChange={(event) => update("dueTime", event.target.value)} required />
        </div>
        <Select
          label="Link to Report"
          value={form.linkedReportId}
          onChange={(event) => update("linkedReportId", event.target.value)}
          options={[{ value: "", label: "No linked report" }, ...openReports.map((report) => ({
            value: report.id, label: `${report.id} — ${report.district || report.type}`,
          }))]}
        />
        <fieldset className="border rounded-md p-3 mb-4">
          <legend className="text-sm font-semibold px-1">Resource Checklist</legend>
          {[["vehicle", "Vehicle Required"], ["medicalKit", "Medical Kit"], ["communicationDevice", "Communication Device"]].map(([key, label]) => (
            <label key={key} className="block my-2 text-sm">
              <input type="checkbox" checked={form.resources[key]} onChange={(event) => setForm((current) => ({ ...current, resources: { ...current.resources, [key]: event.target.checked } }))} /> {label}
            </label>
          ))}
        </fieldset>
        {error && <p role="alert" className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit" loading={saving} disabled={!form.title.trim() || !form.assignedTeamId || !form.dueDate || !form.dueTime}>Create Task</Button>
        </div>
      </form>
    </Modal>
  );
}
