import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Button, Badge, Textarea, Toast } from "../ui";
import Sheet from "../ui/Sheet";
import UrgencyGauge from "./UrgencyGauge";
import { cityCoords, teams } from "../../mockData";

const urgencyFactors = [
  { label: "Days Without Food", value: "28/30" },
  { label: "Water Level", value: "15/20" },
  { label: "People Count", value: "10/20" },
  { label: "Vulnerable Persons", value: "15/15" },
  { label: "Distance from Aid", value: "8/15" },
];

export default function ReportDrawer({ report, isOpen, onClose, onStatusChange }) {
  const [showAssign, setShowAssign] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [toast, setToast] = useState(null);

  if (!report) return null;

  const coords = cityCoords[report.location] || [23.8103, 90.4125];

  function handleAction(action) {
    if (action === "Acknowledge") {
      onStatusChange?.(report.id, "Acknowledged");
      setToast({ type: "info", message: "Report acknowledged." });
    } else if (action === "Mark Resolved") {
      onStatusChange?.(report.id, "Resolved");
      setToast({ type: "success", message: "Report marked as resolved." });
    } else if (action === "Assign Team") {
      setShowAssign(!showAssign);
    } else if (action === "Add Note") {
      setShowNote(!showNote);
    }
    setTimeout(() => setToast(null), 3000);
  }

  function handleSaveNote() {
    if (noteText.trim()) {
      setToast({ type: "info", message: "Note saved." });
      setNoteText("");
      setShowNote(false);
      setTimeout(() => setToast(null), 3000);
    }
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose}>
      <div className="px-6 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">{report.type}</h2>
            <p className="text-sm text-muted-foreground">Report #{report.id}</p>
          </div>
          <Badge
            color={
              report.status === "Acknowledged"
                ? "blue"
                : report.status === "Resolved"
                ? "green"
                : "amber"
            }
            text={report.status}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ["Location", report.location],
            ["Severity", `${report.severity}/5`],
            ["Submitted By", report.submittedBy],
            ["Time", new Date(report.time).toLocaleString([], { dateStyle: "short", timeStyle: "short" })],
            ["Affected", report.affectedCount.toLocaleString()],
            ["Children", report.childrenPresent ? "Yes" : "No"],
            ["Elderly", report.elderlyPresent ? "Yes" : "No"],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
              <p className="font-medium text-foreground">{value}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Description
          </p>
          <p className="text-sm text-foreground leading-relaxed">{report.description}</p>
        </div>

        <div className="h-[200px] rounded-lg overflow-hidden border">
          <MapContainer
            center={coords}
            zoom={10}
            scrollWheelZoom={false}
            attributionControl={false}
            className="h-full w-full"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={coords}>
              <Popup>{report.location}</Popup>
            </Marker>
          </MapContainer>
        </div>

        <UrgencyGauge score={report.urgencyScore} factors={urgencyFactors} />

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {report.status === "Pending" && (
              <Button size="sm" variant="outline" onClick={() => handleAction("Acknowledge")}>
                Acknowledge
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => handleAction("Assign Team")}>
              Assign Team
            </Button>
            {report.status !== "Resolved" && (
              <Button size="sm" variant="outline" onClick={() => handleAction("Mark Resolved")}>
                Mark Resolved
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => handleAction("Add Note")}>
              Add Note
            </Button>
          </div>

          {showAssign && (
            <div className="bg-muted rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Assign to team:</p>
              {teams.map((team) => (
                <button
                  key={team.id}
                  className="block w-full text-left text-sm px-2 py-1 rounded hover:bg-accent transition-colors text-foreground"
                  onClick={() => {
                    setToast({ type: "info", message: `Assigned to ${team.name}` });
                    setShowAssign(false);
                    setTimeout(() => setToast(null), 3000);
                  }}
                >
                  {team.name} ({team.status})
                </button>
              ))}
            </div>
          )}

          {showNote && (
            <div className="space-y-2">
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note..."
                rows={3}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveNote}>
                  Save Note
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowNote(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}
    </Sheet>
  );
}
