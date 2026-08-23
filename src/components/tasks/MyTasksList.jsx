import { useState } from "react";
import { Badge, Button, Card, Textarea, Progress } from "../ui";
import { useAuth } from "../../context/AuthContext";

const priorityColors = { Critical: "red", High: "orange", Medium: "teal", Low: "grey" };
const progressByStatus = { "To Do": 0, "In Progress": 50, "En Route": 75, Completed: 100 };

export default function MyTasksList({ tasks, onUpdateTask }) {
  const { currentUser } = useAuth();
  const [updatingId, setUpdatingId] = useState("");
  const [updateText, setUpdateText] = useState("");
  const myTasks = tasks.filter((task) =>
    task.assignedUserId ? task.assignedUserId === currentUser.id : task.assignedTo === currentUser.name
  );

  function saveUpdate(task) {
    if (updateText.trim()) onUpdateTask(task.id, { updates: [...(task.updates || []), updateText.trim()] });
    setUpdatingId("");
    setUpdateText("");
  }

  return (
    <div className="flex flex-col gap-4">
      {myTasks.map((task) => {
        const progress = progressByStatus[task.status] ?? 0;
        return (
          <Card key={task.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold mb-2">{task.title}</h2>
                <p className="leading-relaxed">{task.description || "No description provided."}</p>
              </div>
              <Badge color={priorityColors[task.priority]} text={task.priority} />
            </div>
            <p className="text-sm text-muted-foreground mt-3 mb-2">
              Due {new Date(task.dueTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
            </p>
            <Progress value={progress} className="mb-1" />
            <p className="text-xs text-muted-foreground mb-3.5">{progress}% complete</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => onUpdateTask(task.id, { status: "In Progress" })}>Start Task</Button>
              <Button size="sm" onClick={() => onUpdateTask(task.id, { status: "Completed" })}>Mark Complete</Button>
              <Button size="sm" variant="outline" onClick={() => setUpdatingId(task.id)}>Add Update</Button>
            </div>
            {updatingId === task.id && (
              <div className="mt-3">
                <Textarea value={updateText} onChange={(e) => setUpdateText(e.target.value)} rows={2} placeholder="Share a progress update" />
                <Button size="sm" onClick={() => saveUpdate(task)}>Save</Button>
              </div>
            )}
          </Card>
        );
      })}
      {!myTasks.length && (
        <Card>
          <p className="text-muted-foreground">No tasks are currently assigned to you.</p>
        </Card>
      )}
    </div>
  );
}
