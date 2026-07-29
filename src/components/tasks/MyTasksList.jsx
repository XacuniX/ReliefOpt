import { useState } from "react";
import { Badge, Button, Card, Textarea } from "../ui";
import { useAuth } from "../../context/AuthContext";

const priorityColors = { Critical: "red", High: "orange", Medium: "teal", Low: "grey" };
const progressByStatus = { "To Do": 0, "In Progress": 50, "En Route": 75, Completed: 100 };

export default function MyTasksList({ tasks, onUpdateTask }) {
  const { currentUser } = useAuth();
  const [updatingId, setUpdatingId] = useState("");
  const [updateText, setUpdateText] = useState("");
  const myTasks = tasks.filter((task) => task.assignedTo === currentUser.name);

  function saveUpdate(task) {
    if (updateText.trim()) onUpdateTask(task.id, { updates: [...(task.updates || []), updateText.trim()] });
    setUpdatingId("");
    setUpdateText("");
  }

  return (
    <section aria-label="My tasks" style={{ display: "grid", gap: 14 }}>
      {myTasks.map((task) => {
        const progress = progressByStatus[task.status] ?? 0;
        return (
          <Card key={task.id}>
            <div style={{ alignItems: "flex-start", display: "flex", gap: 12, justifyContent: "space-between" }}>
              <div>
                <h2 style={{ fontSize: 18, margin: "0 0 8px" }}>{task.title}</h2>
                <p style={{ lineHeight: 1.5, margin: 0 }}>{task.description || "No description provided."}</p>
              </div>
              <Badge color={priorityColors[task.priority]} text={task.priority} />
            </div>
            <p style={{ color: "#64748b", fontSize: 14, margin: "14px 0 8px" }}>Due {new Date(task.dueTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p>
            <div aria-label={`${progress}% complete`} style={{ background: "var(--color-smoke)", borderRadius: 99, height: 9, overflow: "hidden" }}><div style={{ background: "var(--color-teal)", height: "100%", transition: "width .2s", width: `${progress}%` }} /></div>
            <p style={{ color: "#64748b", fontSize: 12, margin: "5px 0 14px" }}>{progress}% complete</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Button size="sm" variant="ghost" onClick={() => onUpdateTask(task.id, { status: "In Progress" })}>Start Task</Button>
              <Button size="sm" onClick={() => onUpdateTask(task.id, { status: "Completed" })}>Mark Complete</Button>
              <Button size="sm" variant="ghost" onClick={() => setUpdatingId(task.id)}>Add Update</Button>
            </div>
            {updatingId === task.id && <div style={{ marginTop: 14 }}><Textarea label="Task update" value={updateText} onChange={(e) => setUpdateText(e.target.value)} rows={2} placeholder="Share a progress update" /><Button size="sm" onClick={() => saveUpdate(task)}>Save</Button></div>}
          </Card>
        );
      })}
      {!myTasks.length && <Card><p style={{ color: "#64748b", margin: 0 }}>No tasks are currently assigned to you.</p></Card>}
    </section>
  );
}
