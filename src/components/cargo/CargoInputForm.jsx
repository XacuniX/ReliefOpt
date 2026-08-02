import { useState } from "react";
import { Button, Card, Input } from "../ui";

const emptyItem = () => ({ id: crypto.randomUUID(), name: "", length: "", width: "", height: "", weight: "", quantity: "" });
const fields = [["length", "L"], ["width", "W"], ["height", "H"], ["weight", "Weight (kg)"], ["quantity", "Qty"]];

export default function CargoInputForm({ onOptimized }) {
  const [vehicle, setVehicle] = useState({ length: "", width: "", height: "" });
  const [items, setItems] = useState([emptyItem()]);
  const [optimizing, setOptimizing] = useState(false);

  const updateItem = (id, field, value) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)));

  function optimize(event) {
    event.preventDefault();
    setOptimizing(true);
    setTimeout(() => { setOptimizing(false); onOptimized?.(); }, 1500);
  }

  return (
    <form onSubmit={optimize}>
      <Card>
        <h2 className="text-lg font-bold mb-4">Vehicle Dimensions</h2>
        <div className="grid grid-cols-3 gap-3">
          {["length", "width", "height"].map((field) => (
            <Input
              key={field}
              label={`${field[0].toUpperCase() + field.slice(1)} (m)`}
              type="number"
              value={vehicle[field]}
              onChange={(e) => setVehicle((current) => ({ ...current, [field]: e.target.value }))}
            />
          ))}
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="text-lg font-bold mb-4">Supply Items</h2>
        {items.map((item, index) => (
          <div key={item.id} className={`grid grid-cols-[minmax(180px,2fr)_repeat(5,minmax(80px,1fr))_auto] gap-2.5 py-3 ${index ? "border-t" : ""}`}>
            <Input label="Item Name" value={item.name} onChange={(e) => updateItem(item.id, "name", e.target.value)} />
            {fields.map(([field, label]) => (
              <Input key={field} label={label} type="number" value={item[field]} onChange={(e) => updateItem(item.id, field, e.target.value)} />
            ))}
            <Button variant="destructive" size="sm" className="self-center mt-3" onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}>
              Remove
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setItems((current) => [...current, emptyItem()])}>+ Add Item</Button>
      </Card>

      <div className="mt-4">
        <Button type="submit" loading={optimizing}>Optimize Packing</Button>
      </div>
    </form>
  );
}
