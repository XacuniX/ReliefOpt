import { useState, useEffect } from "react";
import { Mic } from "lucide-react";
import { Button, Textarea, Toast } from "../ui";
import Dialog from "../ui/Dialog";

export default function VoiceReportModal({ onPlotPin }) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState("idle");
  const [toast, setToast] = useState(null);

  const mockTranscript =
    "Mirpur e pani level 4 foot, 12 jon manush, baccha ache";
  const extracted = {
    location: "Mirpur",
    waterLevel: "4ft",
    peopleStranded: 12,
    childrenPresent: "Yes",
  };

  function handleStart() {
    setStage("listening");
  }

  useEffect(() => {
    if (stage === "listening") {
      const t = setTimeout(() => setStage("processing"), 2000);
      return () => clearTimeout(t);
    }
    if (stage === "processing") {
      const t = setTimeout(() => setStage("done"), 1500);
      return () => clearTimeout(t);
    }
  }, [stage]);

  function handlePlotPin() {
    onPlotPin({
      position: [23.8041, 90.3665],
      location: "Mirpur",
      waterLevel: "4ft",
      peopleCount: "12",
      childrenPresent: "Yes",
    });
    setOpen(false);
    setStage("idle");
    setToast({ type: "success", message: "Voice report plotted on map!" });
    setTimeout(() => setToast(null), 3000);
  }

  function handleClose() {
    setOpen(false);
    setStage("idle");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-[1000] h-14 w-14 rounded-full bg-amber-500 text-white shadow-lg flex items-center justify-center hover:bg-amber-600 transition-colors cursor-pointer"
        aria-label="Voice Report"
      >
        <Mic className="h-6 w-6" />
      </button>

      <Dialog isOpen={open} onClose={handleClose} title="Voice Report">
        <div className="space-y-4">
          {stage === "idle" && (
            <div className="text-center py-6 space-y-4">
              <p className="text-muted-foreground text-sm">
                Tap the mic button to start recording your voice report in
                Bangla or Banglish.
              </p>
              <Button onClick={handleStart}>
                <Mic className="h-4 w-4 mr-2" />
                Start Recording
              </Button>
            </div>
          )}

          {(stage === "listening" || stage === "processing") && (
            <div className="flex flex-col items-center py-4 space-y-4">
              <div
                className={`h-16 w-16 rounded-full flex items-center justify-center ${
                  stage === "listening"
                    ? "bg-red-100 animate-pulse"
                    : "bg-amber-100"
                }`}
              >
                <div
                  className={`h-10 w-10 rounded-full ${
                    stage === "listening" ? "bg-red-500" : "bg-amber-500"
                  }`}
                />
              </div>
              <p className="text-sm font-medium text-foreground">
                {stage === "listening" ? "Listening..." : "Processing..."}
              </p>
            </div>
          )}

          {stage === "done" && (
            <>
              <Textarea
                label="Transcribed Text"
                value={mockTranscript}
                readOnly
                rows={3}
              />

              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">
                  Extracted Fields
                </p>
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(extracted).map(([key, val]) => (
                      <tr key={key} className="border-b border-border last:border-0">
                        <td className="py-1.5 pr-2 text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, " $1")}
                        </td>
                        <td className="py-1.5 font-medium text-foreground">
                          {val}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button className="w-full" onClick={handlePlotPin}>
                Plot Pin on Map
              </Button>
            </>
          )}
        </div>
      </Dialog>

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}
