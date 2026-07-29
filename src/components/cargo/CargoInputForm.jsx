import { useState } from "react";
import { Button, Card, Input } from "../ui";

const emptyItem = () => ({ id: crypto.randomUUID(), name: "", length: "", width: "", height: "", weight: "", quantity: "" });
const labels = [["length", "L"], ["width", "W"], ["height", "H"], ["weight", "Weight in kg"], ["quantity", "Quantity"]];

export default function CargoInputForm({ onOptimized }) {
  const [vehicle, setVehicle] = useState({ length: "", width: "", height: "" });
  const [items, setItems] = useState([emptyItem()]);
  const [optimizing, setOptimizing] = useState(false);
  const updateItem = (id, field, value) => setItems((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));

  function optimize(event) {
    event.preventDefault();
    setOptimizing(true);
    window.setTimeout(() => { setOptimizing(false); onOptimized?.(); }, 1500);
  }

  return (
    <form onSubmit={optimize}>
      <Card>
        <h2 style={{ fontSize: 18, marginTop: 0 }}>Vehicle Dimensions</h2>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
          {["length", "width", "height"].map((field) => <Input key={field} label={`${field[0].toUpperCase() + field.slice(1)} (m)`} type="number" value={vehicle[field]} onChange={(e) => setVehicle((current) => ({ ...current, [field]: e.target.value }))} />)}
        </div>
      </Card>
      <Card style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 18, marginTop: 0 }}>Supply Items</h2>
        {items.map((item, index) => (
          <div key={item.id} style={{ borderTop: index ? "1px solid var(--color-mid)" : "none", display: "grid", gap: 10, gridTemplateColumns: "minmax(180px, 2fr) repeat(5, minmax(80px, 1fr)) auto", padding: "12px 0" }}>
            <Input label="Item Name" value={item.name} onChange={(e) => updateItem(item.id, "name", e.target.value)} />
            {labels.map(([field, label]) => <Input key={field} label={label} type="number" value={item[field]} onChange={(e) => updateItem(item.id, field, e.target.value)} />)}
            <Button variant="danger" size="sm" style={{ alignSelf: "center", marginTop: 12 }} onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}>Remove row</Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={() => setItems((current) => [...current, emptyItem()])}>+ Add Item</Button>
      </Card>
      <div style={{ marginTop: 16 }}><Button type="submit" loading={optimizing}>Optimize Packing</Button></div>
    </form>
  );
}
