import { useState } from "react";
import RoleGate from "../components/RoleGate";
import { Button } from "../components/ui";
import CargoInputForm from "../components/cargo/CargoInputForm";
import PackingCanvas from "../components/cargo/PackingCanvas";

function CargoContent() {
  const [optimized, setOptimized] = useState(false);

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🚚 Cargo Packing Optimizer</h1>
      <div className={`grid gap-6 ${optimized ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
        <CargoInputForm onOptimized={() => setOptimized(true)} />
        {optimized && (
          <section className="animate-[dialog-slide-up_0.35s_ease]">
            <div className="flex justify-end mb-2.5">
              <Button size="sm" variant="outline" onClick={() => window.print()}>Print Plan</Button>
            </div>
            <PackingCanvas />
          </section>
        )}
      </div>
    </div>
  );
}

export default function CargoPage() {
  return <RoleGate allowed={["warehouse_manager", "central_admin"]}><CargoContent /></RoleGate>;
}
