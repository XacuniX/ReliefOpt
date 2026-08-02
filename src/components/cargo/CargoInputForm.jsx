import { useState } from "react";
import { Button, Card, Input, Select } from "../ui";
import { cargoVehicles } from "../../mockData";

const emptyItem = () => ({ id: crypto.randomUUID(), name: "", length: "", width: "", height: "", weight: "", quantity: "", category: "Food" });
const fields = [["length", "L"], ["width", "W"], ["height", "H"], ["weight", "Weight (kg)"], ["quantity", "Qty"]];

export default function CargoInputForm({ onOptimized }) {
  const [vehicle, setVehicle] = useState({ length: "", width: "", height: "", name: "" });
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [items, setItems] = useState([emptyItem()]);
  const [optimizing, setOptimizing] = useState(false);

  const updateItem = (id, field, value) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)));

  function handleVehicleSelect(vehicleId) {
    setSelectedVehicleId(vehicleId);
    const v = cargoVehicles.find((cv) => cv.id === vehicleId);
    if (v) {
      setVehicle({ length: String(v.length), width: String(v.width), height: String(v.height), name: v.name });
    }
  }

  function optimize(event) {
    event.preventDefault();
    setOptimizing(true);
    setTimeout(() => {
      setOptimizing(false);
      const validItems = items.filter((i) => i.name && Number(i.length) > 0);
      const vehicleData = {
        length: Number(vehicle.length) || 6,
        width: Number(vehicle.width) || 2.4,
        height: Number(vehicle.height) || 2.5,
        name: vehicle.name || "Custom Vehicle",
      };
      const itemsData = validItems.map((i) => ({
        id: i.id,
        name: i.name,
        category: i.category,
        length: Number(i.length) || 1,
        width: Number(i.width) || 1,
        height: Number(i.height) || 1,
        weight: Number(i.weight) || 10,
        quantity: Number(i.quantity) || 1,
      }));
      onOptimized?.({ vehicle: vehicleData, items: itemsData });
    }, 1500);
  }

  return (
    <form onSubmit={optimize}>
      <Card>
        <h2 className="text-lg font-bold mb-4">Vehicle Selection</h2>
        <Select
          label="Vehicle"
          value={selectedVehicleId}
          onChange={(e) => handleVehicleSelect(e.target.value)}
          options={[
            { value: "", label: "Select vehicle or enter custom..." },
            ...cargoVehicles.map((cv) => ({ value: cv.id, label: cv.name })),
          ]}
        />
        <div className="grid grid-cols-3 gap-3 mt-3">
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
          <div key={item.id} className={`grid grid-cols-[minmax(150px,2fr)_90px_repeat(4,minmax(70px,1fr))_auto] gap-2 py-3 ${index ? "border-t" : ""}`}>
            <Input label="Item Name" value={item.name} onChange={(e) => updateItem(item.id, "name", e.target.value)} />
            <Select
              label="Category"
              value={item.category}
              onChange={(e) => updateItem(item.id, "category", e.target.value)}
              options={["Food", "Medicine", "Equipment", "Shelter"].map((c) => ({ value: c, label: c }))}
            />
            {fields.slice(0, 4).map(([field, label]) => (
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
