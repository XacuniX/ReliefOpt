import { useMemo, useState } from "react";
import { Button, Card, Toast } from "../components/ui";
import { inventory } from "../mockData";
import InventoryTable from "../components/inventory/InventoryTable";
import ItemFormModal from "../components/inventory/ItemFormModal";
import StockLog from "../components/inventory/StockLog";
import LowStockAlert from "../components/inventory/LowStockAlert";

const warehouses = [
  "Warehouse A",
  "Warehouse B",
  "Warehouse C",
  "Warehouse D",
  "Warehouse E",
];

const pageStyles = {
  page: { maxWidth: 1180, margin: "0 auto" },
  title: { margin: "0 0 6px", fontSize: 28 },
  subtitle: { margin: "0 0 24px", color: "#64748b" },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 16,
  },
  summaryLabel: {
    margin: 0,
    fontSize: 13,
    fontWeight: 600,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  summaryValue: { margin: "8px 0 0", fontSize: 30, fontWeight: 700 },
  section: { marginTop: 28 },
  tabs: {
    display: "flex",
    gap: 4,
    overflowX: "auto",
    borderBottom: "1px solid var(--color-mid)",
  },
  tab: {
    appearance: "none",
    border: "none",
    borderBottom: "3px solid transparent",
    background: "transparent",
    color: "var(--color-navy)",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 600,
    padding: "12px 16px 10px",
    whiteSpace: "nowrap",
  },
};

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
      pendingShipments: 3,
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
      setItems((current) => current.map((item) => item.id === editingItem.id ? { ...item, ...form, status, lastUpdated: new Date().toISOString() } : item));
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
    <main style={pageStyles.page}>
      <h1 style={pageStyles.title}>Inventory</h1>
      <p style={pageStyles.subtitle}>Monitor relief supplies across all warehouses.</p>
      <LowStockAlert items={items} onItemSelect={focusInventoryItem} />

      <section aria-label="Inventory summary" style={pageStyles.summaryGrid}>
        {cards.map(([label, value]) => (
          <Card key={label}>
            <p style={pageStyles.summaryLabel}>{label}</p>
            <p style={pageStyles.summaryValue}>{value}</p>
          </Card>
        ))}
      </section>

      <section style={pageStyles.section} aria-labelledby="warehouse-inventory-heading">
        <div style={{ alignItems: "center", display: "flex", gap: 16, justifyContent: "space-between", marginBottom: 8 }}>
          <h2 id="warehouse-inventory-heading" style={{ margin: 0, fontSize: 20 }}>Warehouse inventory</h2>
          <Button size="sm" onClick={openAddModal}>Add Item</Button>
        </div>
        <div role="tablist" aria-label="Warehouse selector" style={pageStyles.tabs}>
          {warehouses.map((warehouse) => {
            const active = warehouse === activeWarehouse;
            return (
              <button
                key={warehouse}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveWarehouse(warehouse)}
                style={{ ...pageStyles.tab, borderBottomColor: active ? "var(--color-teal)" : "transparent", color: active ? "var(--color-teal)" : "var(--color-navy)" }}
              >
                {warehouse}
              </button>
            );
          })}
        </div>

        <InventoryTable activeWarehouse={activeWarehouse} items={items} onEdit={openEditModal} highlightItemId={highlightItemId} />
        <StockLog />
      </section>
      <ItemFormModal item={editingItem} isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={saveItem} />
      {toastMessage && <Toast type="success" message={toastMessage} onDismiss={() => setToastMessage("")} />}
    </main>
  );
}
