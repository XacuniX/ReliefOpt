export const demoTeams = [
  { id: "t1", name: "Sylhet Flood Response", leaderId: "u3", memberCount: 12, status: "Deployed", location: "Sylhet" },
  { id: "t2", name: "Barishal Cyclone Relief", leaderId: "u4", memberCount: 8, status: "Deployed", location: "Barishal" },
  { id: "t3", name: "Khulna Emergency Squad", leaderId: "u6", memberCount: 10, status: "Standby", location: "Khulna" },
  { id: "t4", name: "Rangpur Earthquake Aid", leaderId: "u7", memberCount: 6, status: "Offline", location: "Rangpur" },
  { id: "t5", name: "Cumilla Fire Response", leaderId: "u9", memberCount: 9, status: "Deployed", location: "Cumilla" },
  { id: "t6", name: "HQ Operations", leaderId: "u1", memberCount: 2, status: "Deployed", location: "Dhaka" },
  { id: "t7", name: "Logistics Unit", leaderId: "u2", memberCount: 3, status: "Standby", location: "Dhaka" },
];

export const demoUsers = [
  { id: "u1", username: "rahim", name: "Rahim Uddin", email: "rahim.uddin@reliefopt.org", role: "central_admin", status: "Active", teamId: "t6", phone: "+880-1711-234567" },
  { id: "u2", username: "fatima", name: "Fatima Begum", email: "fatima.begum@reliefopt.org", role: "warehouse_manager", status: "Active", teamId: "t7", phone: "+880-1812-345678" },
  { id: "u3", username: "kamal", name: "Kamal Hossain", email: "kamal.hossain@reliefopt.org", role: "field_worker", status: "Active", teamId: "t1", phone: "+880-1913-456789" },
  { id: "u4", username: "nasrin", name: "Nasrin Akter", email: "nasrin.akter@reliefopt.org", role: "field_worker", status: "Active", teamId: "t2", phone: "+880-1614-567890" },
  { id: "u5", username: "mizanur", name: "Mizanur Rahman", email: "mizanur.rahman@reliefopt.org", role: "warehouse_manager", status: "Inactive", teamId: "t7", phone: "+880-1515-678901" },
  { id: "u6", username: "taslima", name: "Taslima Khatun", email: "taslima.khatun@reliefopt.org", role: "field_worker", status: "Active", teamId: "t3", phone: "+880-1716-789012" },
  { id: "u7", username: "jahangir", name: "Jahangir Alam", email: "jahangir.alam@reliefopt.org", role: "field_worker", status: "Offline", teamId: "t4", phone: "+880-1817-890123" },
  { id: "u8", username: "sharmin", name: "Sharmin Sultana", email: "sharmin.sultana@reliefopt.org", role: "central_admin", status: "Active", teamId: "t6", phone: "+880-1918-901234" },
  { id: "u9", username: "abdul", name: "Abdul Kader", email: "abdul.kader@reliefopt.org", role: "field_worker", status: "Active", teamId: "t5", phone: "+880-1619-012345" },
  { id: "u10", username: "roksana", name: "Roksana Parvin", email: "roksana.parvin@reliefopt.org", role: "warehouse_manager", status: "Active", teamId: "t7", phone: "+880-1510-123456" },
];

export const demoWarehouses = [
  { id: "w1", name: "Warehouse A", latitude: 23.8103, longitude: 90.4125, address: "Mirpur, Dhaka", capacity: 8000, managerName: "Fatima Begum", managerPhone: "+880-1812-345678" },
  { id: "w2", name: "Warehouse B", latitude: 23.7500, longitude: 90.3800, address: "Mohammadpur, Dhaka", capacity: 6000, managerName: "Mizanur Rahman", managerPhone: "+880-1515-678901" },
  { id: "w3", name: "Warehouse C", latitude: 23.8200, longitude: 90.4500, address: "Tejgaon, Dhaka", capacity: 7500, managerName: "Roksana Parvin", managerPhone: "+880-1510-123456" },
  { id: "w4", name: "Warehouse D", latitude: 23.7000, longitude: 90.3500, address: "Uttara, Dhaka", capacity: 5000, managerName: "Fatima Begum", managerPhone: "+880-1812-345678" },
  { id: "w5", name: "Warehouse E", latitude: 23.7800, longitude: 90.5000, address: "Gulshan, Dhaka", capacity: 9000, managerName: "Roksana Parvin", managerPhone: "+880-1510-123456" },
];

export const demoInventory = [
  { id: "w1-rice", warehouseId: "w1", name: "Rice (Fortified)", category: "Food", qty: 5000, unit: "kg", status: "OK" },
  { id: "w1-water", warehouseId: "w1", name: "Drinking Water (Bottled)", category: "Food", qty: 3000, unit: "liters", status: "OK" },
  { id: "w1-firstaid", warehouseId: "w1", name: "First Aid Kits", category: "Medicine", qty: 15, unit: "boxes", status: "Critical" },
  { id: "w1-tarps", warehouseId: "w1", name: "Emergency Tarpaulins", category: "Shelter", qty: 200, unit: "units", status: "Low" },
  { id: "w1-flashlights", warehouseId: "w1", name: "Flashlights & Batteries", category: "Equipment", qty: 80, unit: "units", status: "OK" },

  { id: "w2-oil", warehouseId: "w2", name: "Cooking Oil", category: "Food", qty: 800, unit: "liters", status: "OK" },
  { id: "w2-paracetamol", warehouseId: "w2", name: "Paracetamol Tablets", category: "Medicine", qty: 5000, unit: "units", status: "OK" },
  { id: "w2-ors", warehouseId: "w2", name: "Oral Rehydration Salts", category: "Medicine", qty: 10, unit: "boxes", status: "Critical" },
  { id: "w2-blankets", warehouseId: "w2", name: "Blankets", category: "Shelter", qty: 150, unit: "units", status: "Low" },
  { id: "w2-pumps", warehouseId: "w2", name: "Portable Water Pumps", category: "Equipment", qty: 6, unit: "units", status: "Critical" },

  { id: "w3-rice", warehouseId: "w3", name: "Rice (Fortified)", category: "Food", qty: 2000, unit: "kg", status: "Low" },
  { id: "w3-sheeting", warehouseId: "w3", name: "Plastic Sheeting Rolls", category: "Shelter", qty: 90, unit: "units", status: "OK" },
  { id: "w3-purification", warehouseId: "w3", name: "Water Purification Tablets", category: "Medicine", qty: 3000, unit: "units", status: "OK" },
  { id: "w3-generators", warehouseId: "w3", name: "Generators", category: "Equipment", qty: 4, unit: "units", status: "Critical" },
  { id: "w3-tents", warehouseId: "w3", name: "Emergency Tents", category: "Shelter", qty: 60, unit: "units", status: "Low" },

  { id: "w4-noodles", warehouseId: "w4", name: "Instant Noodles", category: "Food", qty: 4000, unit: "boxes", status: "OK" },
  { id: "w4-antiseptic", warehouseId: "w4", name: "Antiseptic Solution", category: "Medicine", qty: 200, unit: "liters", status: "OK" },
  { id: "w4-mats", warehouseId: "w4", name: "Sleeping Mats", category: "Shelter", qty: 300, unit: "units", status: "OK" },
  { id: "w4-lanterns", warehouseId: "w4", name: "Solar Lanterns", category: "Equipment", qty: 120, unit: "units", status: "Low" },
  { id: "w4-ors", warehouseId: "w4", name: "ORS Sachets", category: "Medicine", qty: 0, unit: "units", status: "Out of Stock" },

  { id: "w5-milk", warehouseId: "w5", name: "Powdered Milk", category: "Food", qty: 600, unit: "kg", status: "Low" },
  { id: "w5-masks", warehouseId: "w5", name: "Surgical Masks", category: "Medicine", qty: 10000, unit: "units", status: "OK" },
  { id: "w5-radios", warehouseId: "w5", name: "Communication Radios", category: "Equipment", qty: 25, unit: "units", status: "OK" },
  { id: "w5-familytents", warehouseId: "w5", name: "Family Tents", category: "Shelter", qty: 40, unit: "units", status: "Critical" },
  { id: "w5-sanitizer", warehouseId: "w5", name: "Hand Sanitizer", category: "Medicine", qty: 500, unit: "liters", status: "OK" },
];
