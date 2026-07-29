import { useState } from "react";
import RoleGate from "../components/RoleGate";
import { Button } from "../components/ui";
import CargoInputForm from "../components/cargo/CargoInputForm";
import PackingCanvas from "../components/cargo/PackingCanvas";

function CargoContent() {
  const [optimized, setOptimized] = useState(false);
  return (
    <main style={{ maxWidth: 1500, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, margin: "0 0 24px" }}>🚚 Cargo Packing Optimizer</h1>
      <style>{`@keyframes cargo-result-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } } @media (max-width: 800px) { .cargo-layout { grid-template-columns: minmax(0, 1fr) !important; } }`}</style>
      <div className="cargo-layout" style={{ alignItems: "start", display: "grid", gap: 24, gridTemplateColumns: optimized ? "minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 1fr)" }}>
        <CargoInputForm onOptimized={() => setOptimized(true)} />
        {optimized && <section style={{ animation: "cargo-result-fade .35s ease" }} aria-label="Packing result">
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}><Button size="sm" variant="ghost" onClick={() => window.print()}>Print Plan</Button></div>
          <PackingCanvas />
        </section>}
      </div>
    </main>
  );
}

export default function CargoPage() {
  return <RoleGate allowed={["warehouse_manager", "central_admin"]}><CargoContent /></RoleGate>;
}
