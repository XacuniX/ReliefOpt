import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Button, Badge, Textarea, Toast } from "../ui";
import Sheet from "../ui/Sheet";
import UrgencyGauge from "./UrgencyGauge";
import { cityCoords } from "../../mockData";
import { calculateUrgency } from "../../lib/urgency";
import { useData } from "../../context/DataContext";
import { getReportReference } from "../../lib/reportReference";

export default function ReportDrawer({ report, isOpen, onClose }) {
  const { teams, updateReport, addReportNote } = useData();
  const [showAssign, setShowAssign] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [toast, setToast] = useState(null);

  if (!report) return null;

  const coords = report.location
    ? [report.location.lat, report.location.lng]
    : cityCoords[report.district] || [23.8103, 90.4125];
  const calculatedUrgency = calculateUrgency({
    daysWithoutFood: report.daysWithoutFood,
    waterLevelFt: report.waterLevelFt,
    peopleCount: report.peopleCount ?? report.affectedCount,
    childrenPresent: report.childrenPresent,
    elderlyPresent: report.elderlyPresent,
    distanceFromAidKm: report.distanceFromAidKm,
  });
  const urgency = report.urgencyFactors
    ? { score: report.urgencyScore, factors: report.urgencyFactors }
    : calculatedUrgency;

  async function handleAction(action) {
    if (action === "Acknowledge") {
      const result = await updateReport(report.id, { status: "Acknowledged" });
      setToast({ type: "info", message: result.status === "Accepted" ? "Report acknowledged." : "Acknowledgement pending approval." });
    } else if (action === "Mark Resolved") {
      const result = await updateReport(report.id, { status: "Resolved" });
      setToast({ type: "success", message: result.status === "Accepted" ? "Report marked as resolved." : "Resolution pending approval." });
    } else if (action === "Assign Team") {
      setShowAssign(!showAssign);
    } else if (action === "Add Note") {
      setShowNote(!showNote);
    }
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSaveNote() {
    if (noteText.trim()) {
      const result = await addReportNote(report.id, { text: noteText.trim() });
      setToast({ type: "info", message: result.status === "Accepted" ? "Note saved." : "Note saved pending approval." });
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
            <p className="text-sm text-muted-foreground">Report #{getReportReference(report)}</p>
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
            ["Location", report.district || "Unknown"],
            ["Severity", `${report.severity}/5`],
            ["Submitted By", report.submittedBy],
            ["Time", new Date(report.time).toLocaleString([], { dateStyle: "short", timeStyle: "short" })],
            ["Affected", Number(report.affectedCount || 0).toLocaleString()],
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
              <Popup>{report.district || "Unknown"}</Popup>
            </Marker>
          </MapContainer>
        </div>

        <UrgencyGauge score={urgency.score} factors={urgency.factors} />

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned Team</p>
          <p className="text-sm">{teams.find((team) => team.id === report.assignedTeamId)?.name || "Unassigned"}</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</p>
          {(report.notes || []).map((note) => (
            <div key={note.id || note.timestamp} className="rounded-md bg-muted p-2 mb-2 text-sm">
              <p>{note.text}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{note.author || "Unknown"} · {new Date(note.timestamp).toLocaleString()}</p>
            </div>
          ))}
          {!(report.notes || []).length && <p className="text-sm text-muted-foreground">No notes yet.</p>}
        </div>

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
                  onClick={async () => {
                    const result = await updateReport(report.id, { assignedTeamId: team.id });
                    setToast({ type: "info", message: result.status === "Accepted" ? `Assigned to ${team.name}.` : `Assignment to ${team.name} pending approval.` });
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
