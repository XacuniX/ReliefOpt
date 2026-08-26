import { useEffect, useState } from "react";
import { Button, Input } from "../ui";
import Sheet from "../ui/Sheet";

const categoryOptions = ["Food", "Medicine", "Equipment", "Shelter"];
const emptyForm = {
  name: "", address: "", latitude: "", longitude: "", capacity: "",
  managerName: "", managerPhone: "", categories: [],
};

export default function WarehouseDrawer({ isOpen, onClose, onSave }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(emptyForm);
    setError("");
    setSaving(false);
  }, [isOpen]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const toggleCategory = (category) => setForm((current) => ({
    ...current,
    categories: current.categories.includes(category)
      ? current.categories.filter((entry) => entry !== category)
      : [...current.categories, category],
  }));

  async function submit(event) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setError("Warehouse name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({
        name,
        address: form.address.trim(),
        latitude: form.latitude === "" ? null : Number(form.latitude),
        longitude: form.longitude === "" ? null : Number(form.longitude),
        capacity: form.capacity === "" ? null : Number(form.capacity),
        managerName: form.managerName.trim(),
        managerPhone: form.managerPhone.trim(),
        categories: form.categories,
      });
      onClose();
    } catch (saveError) {
      setError(saveError?.message || "Unable to add the warehouse.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose}>
      <div className="px-6 py-4">
        <h2 className="text-lg font-bold text-foreground mb-4">Add Warehouse</h2>
        <form onSubmit={submit}>
          <Input label="Warehouse Name" value={form.name} onChange={(event) => update("name", event.target.value)} maxLength={100} required autoFocus />
          <Input label="Address" value={form.address} onChange={(event) => update("address", event.target.value)} maxLength={200} placeholder="Street, area, district" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Latitude" type="number" step="any" value={form.latitude} onChange={(event) => update("latitude", event.target.value)} placeholder="23.8103" />
            <Input label="Longitude" type="number" step="any" value={form.longitude} onChange={(event) => update("longitude", event.target.value)} placeholder="90.4125" />
          </div>
          <Input label="Storage Capacity (units)" type="number" min="0" value={form.capacity} onChange={(event) => update("capacity", event.target.value)} placeholder="e.g. 5000" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Manager Name" value={form.managerName} onChange={(event) => update("managerName", event.target.value)} maxLength={100} />
            <Input label="Manager Phone" value={form.managerPhone} onChange={(event) => update("managerPhone", event.target.value)} maxLength={30} placeholder="+880-..." />
          </div>
          <fieldset className="border rounded-md p-3 mb-4">
            <legend className="text-sm font-semibold px-1">Initial Inventory Categories</legend>
            {categoryOptions.map((category) => (
              <label key={category} className="block my-2 text-sm">
                <input type="checkbox" checked={form.categories.includes(category)} onChange={() => toggleCategory(category)} /> {category}
              </label>
            ))}
          </fieldset>
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" loading={saving}>Add Warehouse</Button>
          </div>
        </form>
      </div>
    </Sheet>
  );
}
