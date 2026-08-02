import { useState } from "react";
import { useAuth } from "./context/AuthContext";
import { Button, Input, Select, Textarea, Badge, Card, Loader, Modal, Toast } from "./components/ui";
import RoleGate from "./components/RoleGate";

export default function TestApp() {
  const { currentUser, setRole } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">ReliefOpt — Component Test Harness</h1>
      <p className="text-muted-foreground text-sm">Temporary render — delete before production.</p>

      <h2 className="text-base uppercase tracking-wider opacity-60 mt-8 mb-3 font-bold">Auth Context</h2>
      <p>Current role: <strong>{currentUser.role}</strong> (id: {currentUser.id}, name: {currentUser.name})</p>
      <div className="flex gap-2 flex-wrap mt-2">
        <Button variant="outline" size="sm" onClick={() => setRole("field_worker")}>Field Worker</Button>
        <Button variant="outline" size="sm" onClick={() => setRole("warehouse_manager")}>Warehouse Manager</Button>
        <Button variant="outline" size="sm" onClick={() => setRole("central_admin")}>Central Admin</Button>
      </div>

      <h2 className="text-base uppercase tracking-wider opacity-60 mt-8 mb-3 font-bold">RoleGate</h2>
      <RoleGate allowed={["central_admin"]}><Button>Admin-Only</Button></RoleGate>
      <p className="text-sm text-muted-foreground mt-1">Switch role away from central_admin — button disappears.</p>

      <h2 className="text-base uppercase tracking-wider opacity-60 mt-8 mb-3 font-bold">Button Variants</h2>
      <div className="flex gap-3 flex-wrap items-center">
        <Button>Default</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button loading>Loading...</Button>
        <Button disabled>Disabled</Button>
      </div>

      <h2 className="text-base uppercase tracking-wider opacity-60 mt-8 mb-3 font-bold">Input</h2>
      <Input label="Email" placeholder="you@example.com" value="" onChange={() => {}} error="Required field" />

      <h2 className="text-base uppercase tracking-wider opacity-60 mt-8 mb-3 font-bold">Select</h2>
      <Select label="Warehouse" value="wh-a" onChange={() => {}} options={[
        { value: "wh-a", label: "Warehouse A" }, { value: "wh-b", label: "Warehouse B" }, { value: "wh-c", label: "Warehouse C" }
      ]} />

      <h2 className="text-base uppercase tracking-wider opacity-60 mt-8 mb-3 font-bold">Textarea</h2>
      <Textarea label="Description" placeholder="Describe..." value="" onChange={() => {}} rows={3} />

      <h2 className="text-base uppercase tracking-wider opacity-60 mt-8 mb-3 font-bold">Badges</h2>
      <div className="flex gap-2 flex-wrap">
        <Badge color="green" text="Active" />
        <Badge color="red" text="Critical" />
        <Badge color="amber" text="Warning" />
        <Badge color="navy" text="Deployed" />
        <Badge color="teal" text="OK" />
        <Badge color="grey" text="Offline" />
      </div>

      <h2 className="text-base uppercase tracking-wider opacity-60 mt-8 mb-3 font-bold">Card</h2>
      <Card>
        <strong>Relief Operation Summary</strong>
        <p className="mt-2">3 teams deployed. 52,000 people affected. Inventory stable.</p>
      </Card>

      <h2 className="text-base uppercase tracking-wider opacity-60 mt-8 mb-3 font-bold">Loader</h2>
      <div className="flex items-center gap-6">
        <Loader size="sm" />
        <Loader size="md" />
        <Loader size="lg" />
      </div>

      <h2 className="text-base uppercase tracking-wider opacity-60 mt-8 mb-3 font-bold">Modal</h2>
      <Button variant="outline" onClick={() => setModalOpen(true)}>Open Modal</Button>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Confirm">
        <p>Deploy Sylhet Flood Response team?</p>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={() => setModalOpen(false)}>Deploy</Button>
        </div>
      </Modal>

      <Toast type="success" message="System ready" onDismiss={() => {}} />
    </div>
  );
}
