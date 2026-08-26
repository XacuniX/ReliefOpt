import { useEffect, useState } from "react";
import { Button, Input, Modal, Select } from "../ui";

const categories = ["Food", "Medicine", "Equipment", "Shelter"];
const units = ["kg", "boxes", "units", "liters"];

function createForm(item, warehouseNames) {
  return {
    name: item?.name || "",
    category: item?.category || "Food",
    qty: item?.qty ?? 0,
    unit: item?.unit || "units",
    warehouse: item?.warehouse || warehouseNames[0] || "",
    expiryDate: item?.expiryDate || "",
  };
}

export default function ItemFormModal({
  item,
  warehouseNames,
  isOpen,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(() => createForm(item, warehouseNames));

  useEffect(() => {
    if (isOpen) setForm(createForm(item, warehouseNames));
  }, [item, isOpen, warehouseNames]);

  const setField = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));
  const changeQuantity = (amount) =>
    setForm((current) => ({
      ...current,
      qty: Math.max(0, Number(current.qty || 0) + amount),
    }));

  function handleSave() {
    if (!form.name.trim()) return;
    onSave({
      ...form,
      name: form.name.trim(),
      qty: Math.max(0, Number(form.qty) || 0),
    });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={item ? "Edit Item" : "Add Item"}
    >
      <Input
        label="Item Name"
        value={form.name}
        onChange={(event) => setField("name", event.target.value)}
      />
      <Select
        label="Category"
        value={form.category}
        onChange={(event) => setField("category", event.target.value)}
        options={categories.map((value) => ({ value, label: value }))}
      />
      <div className="mb-4">
        <label className="block mb-1.5 text-sm font-semibold">Quantity</label>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => changeQuantity(-1)}
            aria-label="Decrease quantity"
            className="w-9 shrink-0 px-0"
          >
            -
          </Button>
          <Input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={String(form.qty)}
            onChange={(event) => {
              const value = event.target.value;
              setField("qty", value === "" ? "" : Math.max(0, Math.floor(Number(value))));
            }}
            aria-label="Quantity"
            className="m-0 min-w-0 flex-1"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => changeQuantity(1)}
            aria-label="Increase quantity"
            className="w-9 shrink-0 px-0"
          >
            +
          </Button>
        </div>
      </div>
      <Select
        label="Unit"
        value={form.unit}
        onChange={(event) => setField("unit", event.target.value)}
        options={units.map((value) => ({ value, label: value }))}
      />
      <Select
        label="Warehouse"
        value={form.warehouse}
        onChange={(event) => setField("warehouse", event.target.value)}
        options={warehouseNames.map((value) => ({ value, label: value }))}
      />
      <Input
        label="Expiry Date (optional)"
        type="date"
        value={form.expiryDate}
        onChange={(event) => setField("expiryDate", event.target.value)}
      />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!form.name.trim() || !form.warehouse}
        >
          Save
        </Button>
      </div>
    </Modal>
  );
}
