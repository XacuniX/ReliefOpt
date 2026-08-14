import { useState } from "react";
import RoleGate from "../components/RoleGate";
import { Button } from "../components/ui";
import CargoInputForm from "../components/cargo/CargoInputForm";
import PackingCanvas from "../components/cargo/PackingCanvas";

function CargoContent() {
  const [optimizedData, setOptimizedData] = useState(null);

  function downloadPlan() {
    const file = new Blob([JSON.stringify(optimizedData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cargo-packing-plan.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🚚 Cargo Packing Optimizer</h1>
      <div className={`grid gap-6 ${optimizedData ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
        <CargoInputForm onOptimized={(data) => setOptimizedData(data)} />
        {optimizedData && (
          <section className="animate-[dialog-slide-up_0.35s_ease]">
            <div className="flex justify-end gap-2 mb-2.5">
              <Button size="sm" variant="outline" onClick={() => window.print()}>Print Plan</Button>
              <Button size="sm" variant="outline" onClick={downloadPlan}>Download JSON</Button>
            </div>
            <PackingCanvas
              vehicle={optimizedData.vehicle}
              placements={optimizedData.placements}
              rejected={optimizedData.rejected}
              volumeUtilized={optimizedData.volumeUtilized}
              totalWeight={optimizedData.totalWeight}
              fits={optimizedData.fits}
            />
          </section>
        )}
      </div>
    </div>
  );
}

export default function CargoPage() {
  return <RoleGate allowed={["warehouse_manager", "central_admin"]}><CargoContent /></RoleGate>;
}
