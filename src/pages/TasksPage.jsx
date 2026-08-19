import { useState } from "react";
import { Badge, Button, Card, Toast, Loader } from "../components/ui";
import { useData } from "../context/DataContext";
import RoleGate from "../components/RoleGate";
import CreateTaskModal from "../components/tasks/CreateTaskModal";
import MyTasksList from "../components/tasks/MyTasksList";

const statuses = ["To Do", "In Progress", "En Route", "Completed"];
const priorityColors = { Critical: "red", High: "orange", Medium: "teal", Low: "grey" };
const columnBg = { "To Do": "bg-teal-50/50 dark:bg-blue-950/20", "In Progress": "bg-amber-50/50 dark:bg-amber-950/20", "En Route": "bg-purple-50/50 dark:bg-purple-950/20", Completed: "bg-emerald-50/50 dark:bg-emerald-950/20" };

function teamFor(users, assignee) {
  return users.find((user) => user.name === assignee)?.team || assignee || "Unassigned team";
}

function dueLabel(time) {
  return `Due ${new Date(time).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`;
}

function KanbanBoard({ taskList, users, onMoveTask }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-2">
      {statuses.map((status) => {
        const columnTasks = taskList.filter((task) => task.status === status);
        return (
          <section key={status} className={`rounded-lg p-3 min-h-[420px] min-w-[240px] ${columnBg[status] || ""}`}>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-base font-semibold">{status}</h3>
              <span className="bg-card rounded-full text-xs text-muted-foreground px-2 py-0.5">{columnTasks.length}</span>
            </div>
            <div className="flex flex-col gap-3">
              {columnTasks.map((task) => {
                const nextStatus = statuses[statuses.indexOf(task.status) + 1];
                return (
                  <Card key={task.id} className="p-4">
                    <p className="text-xs text-muted-foreground m-0">{task.id}</p>
                    <h3 className="text-base font-semibold leading-tight my-1.5">{task.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{teamFor(users, task.assignedTo)}</p>
                    <div className="flex items-center gap-2 justify-between">
                      <Badge color={priorityColors[task.priority]} text={task.priority} />
                      {nextStatus && (
                        <details className="relative inline-block">
                          <summary className="cursor-pointer text-[13px] font-semibold list-none">Move →</summary>
                          <div className="absolute right-0 mt-1 w-40 bg-card border rounded-md shadow-lg p-1 z-10">
                            <button
                              type="button"
                              className="w-full text-left px-2 py-1.5 text-[13px] hover:bg-muted rounded"
                              onClick={() => onMoveTask(task.id, nextStatus)}
                            >
                              Move to {nextStatus}
                            </button>
                          </div>
                        </details>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2.5">{dueLabel(task.dueTime)}</p>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default function TasksPage() {
  const { ready, tasks, users, addTask, updateTask } = useData();
  const [toastMessage, setToastMessage] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  function createTask(task) {
    addTask(task);
    setToastMessage("Task created and added to To Do.");
  }

  if (!ready) {
    return (
      <div className="max-w-7xl mx-auto">
        <Loader />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">Coordinate relief work from assignment through completion.</p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>+ New Task</Button>
      </div>
      <RoleGate allowed={["central_admin", "warehouse_manager"]}>
        <KanbanBoard taskList={tasks} users={users} onMoveTask={(id, status) => updateTask(id, { status })} />
      </RoleGate>
      <RoleGate allowed={["field_worker"]}>
        <MyTasksList tasks={tasks} onUpdateTask={updateTask} />
      </RoleGate>
      <CreateTaskModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} onCreate={createTask} />
      {toastMessage && <Toast type="success" message={toastMessage} onDismiss={() => setToastMessage("")} />}
    </div>
  );
}
