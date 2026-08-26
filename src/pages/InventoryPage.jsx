import { useEffect, useMemo, useState } from "react";
import { Button, Card, Toast, Loader } from "../components/ui";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import InventoryTable from "../components/inventory/InventoryTable";
import ItemFormModal from "../components/inventory/ItemFormModal";
import WarehouseDrawer from "../components/inventory/WarehouseDrawer";
import StockLog from "../components/inventory/StockLog";
import LowStockAlert from "../components/inventory/LowStockAlert";
import { Tabs, TabsContent } from "../components/ui/Tabs";
import { createWarehouse } from "../lib/warehouseApi";

export default function InventoryPage() {
  const {
    ready,
    inventory,
    warehouses: warehouseRecords,
    addItem,
    updateItem,
    replaceWarehouses,
  } = useData();
  const { currentUser, accessToken } = useAuth();
  const warehouseNames = useMemo(
    () => warehouseRecords.map((warehouse) => warehouse.name),
    [warehouseRecords],
  );
  const [activeWarehouse, setActiveWarehouse] = useState("");
  const [editingItem, setEditingItem] = useState(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [warehouseDrawerOpen, setWarehouseDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [highlightItemId, setHighlightItemId] = useState("");

  useEffect(() => {
    if (warehouseNames.length && !warehouseNames.includes(activeWarehouse)) {
      setActiveWarehouse(warehouseNames[0]);
    }
  }, [activeWarehouse, warehouseNames]);

  const summary = useMemo(
    () => ({
      totalSkus: inventory.length,
      lowStock: inventory.filter((item) => item.qty < 20).length,
      outOfStock: inventory.filter((item) => item.qty === 0).length,
      pendingShipments: inventory.filter(
        (item) => item.qty <= 5 && item.qty > 0,
      ).length,
    }),
    [inventory],
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

  async function saveItem(form) {
    const status = form.qty <= 5 ? "Critical" : form.qty < 20 ? "Low" : "OK";
    const userName = currentUser?.name || "Unknown";
    const warehouseId =
      warehouseRecords.find((w) => w.name === form.warehouse)?.id ?? null;
    if (editingItem) {
      const delta = Number(form.qty) - Number(editingItem.qty);
      await updateItem(editingItem.id, {
        ...form,
        warehouseId,
        status,
        lastUpdated: new Date().toISOString(),
        ...(delta !== 0
          ? {
              stockLog: {
                id: crypto.randomUUID(),
                itemName: form.name,
                change: delta,
                reason: "Adjustment",
                user: userName,
                timestamp: new Date().toISOString(),
              },
            }
          : {}),
      });
      setToastMessage("Inventory item updated successfully.");
    } else {
      const id = crypto.randomUUID();
      await addItem({
        ...form,
        id,
        warehouseId,
        status,
        lastUpdated: new Date().toISOString(),
        stockLog: {
          id: crypto.randomUUID(),
          itemName: form.name,
          change: form.qty,
          reason: "Restocking",
          user: userName,
          timestamp: new Date().toISOString(),
        },
      });
      setToastMessage("Inventory item added successfully.");
    }
    setModalOpen(false);
  }

  async function saveWarehouse(form) {
    const { categories, ...warehouseFields } = form;
    const response = await createWarehouse(accessToken, warehouseFields);
    const created = response.warehouse;
    replaceWarehouses([...warehouseRecords, created]);

    const userName = currentUser?.name || "Unknown";
    for (const category of categories) {
      await addItem({
        id: crypto.randomUUID(),
        name: category,
        category,
        qty: 0,
        unit: "units",
        warehouseId: created.id,
        warehouse: created.name,
        status: "Critical",
        lastUpdated: new Date().toISOString(),
        stockLog: {
          id: crypto.randomUUID(),
          itemName: category,
          change: 0,
          reason: "Restocking",
          user: userName,
          timestamp: new Date().toISOString(),
        },
      });
    }

    setActiveWarehouse(created.name);
    setToastMessage(`${created.name} was added.`);
  }

  if (!ready) {
    return (
      <div className="max-w-6xl mx-auto">
        <Loader />
      </div>
    );
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
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        Monitor relief supplies across all warehouses.
      </p>

      <LowStockAlert items={inventory} onItemSelect={focusInventoryItem} />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {cards.map(([label, value]) => (
          <Card key={label}>
            <p className="text-[13px] text-muted-foreground font-semibold uppercase tracking-wider">
              {label}
            </p>
            <p className="text-3xl font-bold mt-2">{value}</p>
          </Card>
        ))}
      </div>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold">Warehouse inventory</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setWarehouseDrawerOpen(true)}>
              Add Warehouse
            </Button>
            <Button size="sm" onClick={openAddModal}>
              Add Item
            </Button>
          </div>
        </div>

        <Tabs value={activeWarehouse} onValueChange={setActiveWarehouse}>
          {warehouseNames.map((wh) => (
            <TabsContent key={wh} value={wh}>
              {wh}
            </TabsContent>
          ))}
        </Tabs>

        <InventoryTable
          activeWarehouse={activeWarehouse}
          items={inventory}
          onEdit={openEditModal}
          highlightItemId={highlightItemId}
        />
        <StockLog />
      </section>

      <ItemFormModal
        item={editingItem}
        warehouseNames={warehouseNames}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={saveItem}
      />
      <WarehouseDrawer
        isOpen={warehouseDrawerOpen}
        onClose={() => setWarehouseDrawerOpen(false)}
        onSave={saveWarehouse}
      />
      {toastMessage && (
        <Toast
          type="success"
          message={toastMessage}
          onDismiss={() => setToastMessage("")}
        />
      )}
    </div>
  );
}
