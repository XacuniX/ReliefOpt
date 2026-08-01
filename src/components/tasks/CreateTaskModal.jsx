import { useState } from "react";
import { Button, Input, Modal, Select, Textarea } from "../ui";
import { reports, teams } from "../../mockData";

const emptyForm = {
  title: "", description: "", priority: "Medium", assignedTo: "", dueDate: "", dueTime: "",
  linkedReport: "", resources: { vehicle: false, medicalKit: false, communicationDevice: false },
};

const grid = { display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" };

export default function CreateTaskModal({ isOpen, onClose, onCreate }) {
  const [form, setForm] = useState(emptyForm);
  const openReports = reports.filter((report) => report.status !== "Resolved");
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  function submit(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.assignedTo || !form.dueDate || !form.dueTime) return;
    onCreate({
      id: `task${Date.now()}`,
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      assignedTo: form.assignedTo,
      dueTime: new Date(`${form.dueDate}T${form.dueTime}`).toISOString(),
      linkedReport: form.linkedReport || undefined,
      resources: form.resources,
      status: "To Do",
    });
    setForm(emptyForm);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Task">
      <form onSubmit={submit}>
        <Input label="Task Title" value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Enter task title" />
        <Textarea label="Description" value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Describe the task" rows={3} />
        <div style={grid}>
          <Select label="Priority" value={form.priority} onChange={(e) => update("priority", e.target.value)} options={["Critical", "High", "Medium", "Low"].map((value) => ({ value, label: value }))} />
          <Select label="Assign To" value={form.assignedTo} onChange={(e) => update("assignedTo", e.target.value)} options={[{ value: "", label: "Select a team" }, ...teams.map((team) => ({ value: team.name, label: team.name }))]} />
          <Input label="Due Date" type="date" value={form.dueDate} onChange={(e) => update("dueDate", e.target.value)} />
          <Input label="Due Time" type="time" value={form.dueTime} onChange={(e) => update("dueTime", e.target.value)} />
        </div>
        <Select label="Link to Report" value={form.linkedReport} onChange={(e) => update("linkedReport", e.target.value)} options={[{ value: "", label: "No linked report" }, ...openReports.map((report) => ({ value: report.id, label: report.id }))]} />
        <fieldset style={{ border: "1px solid var(--color-mid)", borderRadius: 6, margin: "0 0 18px", padding: "12px" }}>
          <legend style={{ fontSize: 14, fontWeight: 600, padding: "0 4px" }}>Resource Checklist</legend>
          {[["vehicle", "Vehicle Required"], ["medicalKit", "Medical Kit"], ["communicationDevice", "Communication Device"]].map(([key, label]) => (
            <label key={key} style={{ display: "block", margin: "8px 0" }}>
              <input type="checkbox" checked={form.resources[key]} onChange={(e) => setForm((current) => ({ ...current, resources: { ...current.resources, [key]: e.target.checked } }))} /> {label}
            </label>
          ))}
        </fieldset>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button type="submit" disabled={!form.title.trim() || !form.assignedTo || !form.dueDate || !form.dueTime}>Create Task</Button>
        </div>
      </form>
    </Modal>
  );
}
