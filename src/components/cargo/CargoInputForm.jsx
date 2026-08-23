import { useState } from "react";
import { Button, Card, Input, Select } from "../ui";
import { cargoVehicles } from "../../mockData";
import { optimize as optimizePacking } from "../../lib/packing";

const emptyItem = () => ({ id: crypto.randomUUID(), name: "", length: "", width: "", height: "", weight: "", quantity: "", category: "Food" });
const fields = [["length", "L (cm)"], ["width", "W (cm)"], ["height", "H (cm)"], ["weight", "Weight (kg)"], ["quantity", "Qty"]];

export default function CargoInputForm({ onOptimized }) {
  const [vehicle, setVehicle] = useState({ length: "", width: "", height: "", maxWeight: "", name: "" });
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [items, setItems] = useState([emptyItem()]);
  const [optimizing, setOptimizing] = useState(false);
  const [errors, setErrors] = useState([]);

  const updateItem = (id, field, value) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)));

  function handleVehicleSelect(vehicleId) {
    setSelectedVehicleId(vehicleId);
    const v = cargoVehicles.find((cv) => cv.id === vehicleId);
    if (v) {
      setVehicle({ length: String(v.length), width: String(v.width), height: String(v.height), name: v.name, maxWeight: String(v.maxWeight) });
    }
  }

  function handleOptimize(event) {
    event.preventDefault();
    const validationErrors = [];
    for (const field of ["length", "width", "height", "maxWeight"]) {
      if (!Number.isFinite(Number(vehicle[field])) || Number(vehicle[field]) <= 0) {
        validationErrors.push(`Vehicle ${field} must be a positive number.`);
      }
    }
    items.forEach((item, index) => {
      if (!item.name.trim()) validationErrors.push(`Item ${index + 1} needs a name.`);
      for (const field of ["length", "width", "height"]) {
        if (!Number.isFinite(Number(item[field])) || Number(item[field]) <= 0) {
          validationErrors.push(`Item ${index + 1} ${field} must be a positive number.`);
        }
      }
      if (!Number.isFinite(Number(item.weight)) || Number(item.weight) < 0) {
        validationErrors.push(`Item ${index + 1} weight cannot be negative.`);
      }
      if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0) {
        validationErrors.push(`Item ${index + 1} quantity must be a positive integer.`);
      }
    });
    setErrors(validationErrors);
    if (validationErrors.length) return;
    setOptimizing(true);
    requestAnimationFrame(() => {
      const vehicleData = {
        length: Number(vehicle.length),
        width: Number(vehicle.width),
        height: Number(vehicle.height),
        name: vehicle.name || "Custom Vehicle",
        maxWeight: Number(vehicle.maxWeight),
      };
      const itemsData = items.map((i) => ({
        id: i.id,
        name: i.name,
        category: i.category,
        length: Number(i.length),
        width: Number(i.width),
        height: Number(i.height),
        weight: Number(i.weight),
        quantity: Number(i.quantity),
      }));
      onOptimized?.({ vehicle: vehicleData, items: itemsData, ...optimizePacking(vehicleData, itemsData) });
      setOptimizing(false);
    });
  }

  return (
    <form onSubmit={handleOptimize}>
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          {["length", "width", "height"].map((field) => (
            <Input
              key={field}
              label={`${field[0].toUpperCase() + field.slice(1)} (m)`}
              type="number"
              min="0.01"
              step="any"
              value={vehicle[field]}
              onChange={(e) => setVehicle((current) => ({ ...current, [field]: e.target.value }))}
            />
          ))}
          <Input
            label="Max Weight (kg)"
            type="number"
            min="0.01"
            step="any"
            value={vehicle.maxWeight}
            onChange={(event) => setVehicle((current) => ({ ...current, maxWeight: event.target.value }))}
          />
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="text-lg font-bold mb-4">Supply Items</h2>
        {items.map((item, index) => (
          <div key={item.id} className={`grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-[minmax(150px,2fr)_90px_repeat(5,minmax(70px,1fr))_auto] gap-2 py-3 ${index ? "border-t" : ""}`}>
            <Input label="Item Name" value={item.name} onChange={(e) => updateItem(item.id, "name", e.target.value)} />
            <Select
              label="Category"
              value={item.category}
              onChange={(e) => updateItem(item.id, "category", e.target.value)}
              options={["Food", "Medicine", "Equipment", "Shelter"].map((c) => ({ value: c, label: c }))}
            />
            {fields.map(([field, label]) => (
              <Input
                key={field}
                label={label}
                type="number"
                min={field === "weight" ? "0" : field === "quantity" ? "1" : "0.01"}
                step={field === "quantity" ? "1" : "any"}
                value={item[field]}
                onChange={(e) => updateItem(item.id, field, e.target.value)}
              />
            ))}
            <Button variant="destructive" size="sm" className="self-center mt-3" onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}>
              Remove
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setItems((current) => [...current, emptyItem()])}>+ Add Item</Button>
      </Card>

      <div className="mt-4">
        {errors.length > 0 && (
          <div role="alert" className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
            <strong>Fix these values:</strong>
            <ul className="list-disc pl-5 mt-1">{errors.map((error) => <li key={error}>{error}</li>)}</ul>
          </div>
        )}
        <Button type="submit" loading={optimizing}>Optimize Packing</Button>
      </div>
    </form>
  );
}
