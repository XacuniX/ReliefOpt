import { useState } from "react";
import { Badge, Button, Card, Toast } from "../components/ui";
import { tasks as mockTasks, users } from "../mockData";
import RoleGate from "../components/RoleGate";
import CreateTaskModal from "../components/tasks/CreateTaskModal";
import MyTasksList from "../components/tasks/MyTasksList";

const statuses = ["To Do", "In Progress", "En Route", "Completed"];
const priorityColors = { Critical: "red", High: "orange", Medium: "teal", Low: "grey" };

const styles = {
  page: { maxWidth: 1500, margin: "0 auto" },
  header: { alignItems: "center", display: "flex", gap: 16, justifyContent: "space-between", marginBottom: 24 },
  title: { fontSize: 28, margin: 0 },
  board: { display: "grid", gap: 16, gridTemplateColumns: "repeat(4, minmax(240px, 1fr))", overflowX: "auto", paddingBottom: 8 },
  column: { background: "rgba(189, 195, 199, 0.20)", borderRadius: 8, minHeight: 420, minWidth: 240, padding: 12 },
  columnTitle: { alignItems: "center", display: "flex", fontSize: 16, justifyContent: "space-between", margin: "2px 2px 12px" },
  count: { background: "var(--color-white)", borderRadius: "999px", color: "#64748b", fontSize: 12, padding: "3px 8px" },
  card: { marginBottom: 12, padding: 16 },
  id: { color: "var(--color-mid)", fontSize: 12, margin: 0 },
  taskTitle: { fontSize: 16, lineHeight: 1.35, margin: "6px 0 10px" },
  team: { color: "#64748b", fontSize: 14, margin: "0 0 14px" },
  footer: { alignItems: "center", display: "flex", gap: 8, justifyContent: "space-between" },
  due: { color: "#64748b", fontSize: 12, margin: "10px 0 0" },
  move: { display: "inline-block", position: "relative" },
  moveMenu: { background: "var(--color-white)", border: "1px solid var(--color-mid)", borderRadius: 6, boxShadow: "0 4px 12px rgba(27,42,74,.14)", marginTop: 4, padding: 4, position: "absolute", right: 0, width: 150, zIndex: 1 },
  moveOption: { background: "transparent", border: "none", color: "var(--color-navy)", cursor: "pointer", font: "inherit", fontSize: 13, padding: "8px", textAlign: "left", width: "100%" },
};

function teamFor(assignee) {
  return users.find((user) => user.name === assignee)?.team || assignee || "Unassigned team";
}

function dueLabel(time) {
  return `Due ${new Date(time).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`;
}

function KanbanBoard({ taskList, onMoveTask }) {
  return (
    <section aria-label="Task board" style={styles.board}>
      {statuses.map((status) => {
        const columnTasks = taskList.filter((task) => task.status === status);
        return (
          <section key={status} style={styles.column} aria-labelledby={`column-${status.replaceAll(" ", "-")}`}>
            <h2 id={`column-${status.replaceAll(" ", "-")}`} style={styles.columnTitle}>{status}<span style={styles.count}>{columnTasks.length}</span></h2>
            {columnTasks.map((task) => {
              const nextStatus = statuses[statuses.indexOf(task.status) + 1];
              return (
                <Card key={task.id} style={styles.card}>
                  <p style={styles.id}>{task.id}</p>
                  <h3 style={styles.taskTitle}>{task.title}</h3>
                  <p style={styles.team}>{teamFor(task.assignedTo)}</p>
                  <div style={styles.footer}>
                    <Badge color={priorityColors[task.priority]} text={task.priority} />
                    {nextStatus && <details style={styles.move}>
                      <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600, listStyle: "none" }}>Move →</summary>
                      <div style={styles.moveMenu}><button type="button" style={styles.moveOption} onClick={() => onMoveTask(task.id, nextStatus)}>Move to {nextStatus}</button></div>
                    </details>}
                  </div>
                  <p style={styles.due}>{dueLabel(task.dueTime)}</p>
                </Card>
              );
            })}
          </section>
        );
      })}
    </section>
  );
}

export default function TasksPage() {
  const [taskList, setTaskList] = useState(mockTasks);
  const [toastMessage, setToastMessage] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const updateTask = (id, changes) => setTaskList((current) => current.map((task) => task.id === id ? { ...task, ...changes } : task));

  function createTask(task) {
    setTaskList((current) => [...current, task]);
    setToastMessage("Task created and added to To Do.");
  }

  return (
    <main style={styles.page}>
      <div style={styles.header}>
        <div><h1 style={styles.title}>Tasks</h1><p style={{ color: "#64748b", margin: "6px 0 0" }}>Coordinate relief work from assignment through completion.</p></div>
        <Button onClick={() => setCreateModalOpen(true)}>+ New Task</Button>
      </div>
      <RoleGate allowed={["central_admin", "warehouse_manager"]}><KanbanBoard taskList={taskList} onMoveTask={(id, status) => updateTask(id, { status })} /></RoleGate>
      <RoleGate allowed={["field_worker"]}><MyTasksList tasks={taskList} onUpdateTask={updateTask} /></RoleGate>
      <CreateTaskModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} onCreate={createTask} />
      {toastMessage && <Toast type="success" message={toastMessage} onDismiss={() => setToastMessage("")} />}
    </main>
  );
}
