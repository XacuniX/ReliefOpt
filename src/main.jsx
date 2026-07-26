import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import AuthProvider, { useAuth } from "./context/AuthContext";
import {
  Button,
  Input,
  Select,
  Textarea,
  Badge,
  Card,
  Loader,
  Modal,
  Toast,
} from "./components/ui";
import RoleGate from "./components/RoleGate";

/* ── Inline CSS variables (temporary — will move to theme.css) ── */
const themeStyle = document.createElement("style");
themeStyle.textContent = `
  :root {
    --color-navy: #1B2A4A;
    --color-teal: #16A085;
    --color-amber: #F39C12;
    --color-smoke: #F0F2F5;
    --color-white: #FFFFFF;
    --color-mid: #BDC3C7;
  }
  *, *::before, *::after { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    background: var(--color-smoke);
    color: var(--color-navy);
  }
  h2.section { margin: 28px 0 12px; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.6; }
`;
document.head.appendChild(themeStyle);

/* ── Test App ── */
function TestApp() {
  const { currentUser, setRole } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 4 }}>ReliefOpt — Component Test Harness</h1>
      <p style={{ marginTop: 0, opacity: 0.6 }}>Temporary render — delete this file before production.</p>

      {/* ── Auth / Role ── */}
      <h2 className="section">Auth Context</h2>
      <p>
        Current role: <strong>{currentUser.role}</strong> (id: {currentUser.id}, name: {currentUser.name})
      </p>
      <Button variant="ghost" size="sm" onClick={() => setRole("field_worker")}>
        Switch to field_worker
      </Button>{" "}
      <Button variant="ghost" size="sm" onClick={() => setRole("warehouse_manager")}>
        Switch to warehouse_manager
      </Button>{" "}
      <Button variant="ghost" size="sm" onClick={() => setRole("central_admin")}>
        Switch to central_admin
      </Button>

      {/* ── RoleGate ── */}
      <h2 className="section">RoleGate (central_admin only)</h2>
      <RoleGate allowed={["central_admin"]}>
        <Button variant="primary">🔒 Admin-Only Button (visible)</Button>
      </RoleGate>
      <p style={{ fontSize: 13, opacity: 0.5 }}>
        If you switch role away from central_admin, the button above disappears.
      </p>

      {/* ── Buttons ── */}
      <h2 className="section">Button Variants</h2>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <Button variant="primary">Primary</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="primary" loading={true}>Loading…</Button>
        <Button variant="primary" disabled>Disabled</Button>
      </div>

      {/* ── Input ── */}
      <h2 className="section">Input (with error)</h2>
      <Input
        label="Email Address"
        placeholder="you@example.com"
        value=""
        onChange={() => {}}
        error="This field is required"
      />

      {/* ── Select ── */}
      <h2 className="section">Select</h2>
      <Select
        label="Warehouse"
        value="wh-a"
        onChange={() => {}}
        options={[
          { value: "wh-a", label: "Warehouse A — Dhaka" },
          { value: "wh-b", label: "Warehouse B — Chattogram" },
          { value: "wh-c", label: "Warehouse C — Sylhet" },
        ]}
      />

      {/* ── Textarea ── */}
      <h2 className="section">Textarea</h2>
      <Textarea
        label="Incident Description"
        placeholder="Describe the situation on the ground…"
        value=""
        onChange={() => {}}
        rows={3}
      />

      {/* ── Badges ── */}
      <h2 className="section">Badge (all 6 colors)</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Badge color="green" text="Active" />
        <Badge color="red" text="Critical" />
        <Badge color="amber" text="Warning" />
        <Badge color="navy" text="Deployed" />
        <Badge color="teal" text="OK" />
        <Badge color="grey" text="Offline" />
      </div>

      {/* ── Card ── */}
      <h2 className="section">Card</h2>
      <Card>
        <strong>Relief Operation Summary</strong>
        <p style={{ margin: "8px 0 0" }}>
          3 teams deployed across Sylhet, Barishal, and Cumilla districts. 
          52,000 people in affected zones. Inventory levels stable except Warehouse E.
        </p>
      </Card>

      {/* ── Loaders ── */}
      <h2 className="section">Loader (sm / md / lg)</h2>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <Loader size="sm" />
        <Loader size="md" />
        <Loader size="lg" />
      </div>

      {/* ── Modal (state-controlled) ── */}
      <h2 className="section">Modal</h2>
      <Button variant="ghost" onClick={() => setModalOpen(true)}>Open Modal</Button>
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Confirm Deployment"
      >
        <p>Deploy Sylhet Flood Response team to Companiganj upazila?</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <Button variant="ghost" onClick={() => console.log("closed")}>Cancel</Button>
          <Button variant="primary" onClick={() => console.log("confirmed")}>Deploy</Button>
        </div>
      </Modal>

      {/* ── Toast ── */}
      <Toast type="success" message="System ready" onDismiss={() => console.log("toast dismissed")} />
    </div>
  );
}

/* ── Mount ── */
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <TestApp />
    </AuthProvider>
  </React.StrictMode>
);
