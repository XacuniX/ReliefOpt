import { useMemo, useState } from "react";
import { Button, Card, Toast } from "../components/ui";
import { inventory } from "../mockData";
import InventoryTable from "../components/inventory/InventoryTable";
import ItemFormModal from "../components/inventory/ItemFormModal";
import StockLog from "../components/inventory/StockLog";
import LowStockAlert from "../components/inventory/LowStockAlert";
import { Tabs, TabsContent } from "../components/ui/Tabs";

const warehouses = ["Warehouse A", "Warehouse B", "Warehouse C", "Warehouse D", "Warehouse E"];

export default function InventoryPage() {
  const [activeWarehouse, setActiveWarehouse] = useState(warehouses[0]);
  const [items, setItems] = useState(inventory);
  const [editingItem, setEditingItem] = useState(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [highlightItemId, setHighlightItemId] = useState("");

  const summary = useMemo(
    () => ({
      totalSkus: items.length,
      lowStock: items.filter((item) => item.qty < 20).length,
      outOfStock: items.filter((item) => item.qty === 0).length,
      pendingShipments: items.filter((item) => item.qty <= 5 && item.qty > 0).length,
    }),
    [items]
  );

  function openAddModal() {
    setEditingItem(undefined);
    setModalOpen(true);
  }

  function openEditModal(item) {
    setEditingItem(item);
    setModalOpen(true);
  }

  function focusInventoryItem(item) {
    setActiveWarehouse(item.warehouse);
    setHighlightItemId(item.id);
  }

  function saveItem(form) {
    const status = form.qty <= 5 ? "Critical" : form.qty < 20 ? "Low" : "OK";
    if (editingItem) {
      setItems((current) => current.map((item) => (item.id === editingItem.id ? { ...item, ...form, status, lastUpdated: new Date().toISOString() } : item)));
      setToastMessage("Inventory item updated successfully.");
    } else {
      setItems((current) => [...current, { ...form, id: `inv${Date.now()}`, status, lastUpdated: new Date().toISOString() }]);
      setToastMessage("Inventory item added successfully.");
    }
    setModalOpen(false);
  }

  const cards = [
    ["Total SKUs", summary.totalSkus],
    ["Low Stock Items", summary.lowStock],
    ["Out of Stock", summary.outOfStock],
    ["Pending Shipments", summary.pendingShipments],
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">Monitor relief supplies across all warehouses.</p>

      <LowStockAlert items={items} onItemSelect={focusInventoryItem} />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {cards.map(([label, value]) => (
          <Card key={label}>
            <p className="text-[13px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
          </Card>
        ))}
      </div>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold">Warehouse inventory</h2>
          <Button size="sm" onClick={openAddModal}>Add Item</Button>
        </div>

        <Tabs value={activeWarehouse} onValueChange={setActiveWarehouse}>
          {warehouses.map((wh) => (
            <TabsContent key={wh} value={wh}>
              {wh}
            </TabsContent>
          ))}
        </Tabs>

        <InventoryTable activeWarehouse={activeWarehouse} items={items} onEdit={openEditModal} highlightItemId={highlightItemId} />
        <StockLog />
      </section>

      <ItemFormModal item={editingItem} isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={saveItem} />
      {toastMessage && <Toast type="success" message={toastMessage} onDismiss={() => setToastMessage("")} />}
    </div>
  );
}
