function getMaxWeight(vehicle) {
  const value = Number(vehicle.maxWeight);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function expandBoxes(boxes) {
  return boxes.flatMap((box) => {
    const requestedQuantity = Number(box.quantity);
    const quantity = Number.isFinite(requestedQuantity)
      ? Math.max(0, Math.floor(requestedQuantity))
      : 1;
    return Array.from({ length: quantity }, (_, index) => ({
      ...box,
      boxId: `${box.id || box.name || "box"}-${index + 1}`,
      length: Number(box.length),
      width: Number(box.width),
      height: Number(box.height),
      weight: Number(box.weight) || 0,
    }));
  });
}

/**
 * Packs centimetre-sized boxes into a metre-sized vehicle using shelf/layer packing.
 */
function shelfPacking(vehicle = {}, boxes = []) {
  // All placement coordinates and dimensions below are centimetres.
  const vehicleLength = Math.max(0, Number(vehicle.length) * 100);
  const vehicleWidth = Math.max(0, Number(vehicle.width) * 100);
  const vehicleHeight = Math.max(0, Number(vehicle.height) * 100);
  const vehicleVolume = vehicleLength * vehicleWidth * vehicleHeight;
  const maxWeight = getMaxWeight(vehicle);

  const placements = [];
  const rejected = [];
  let totalWeight = 0;
  let usedVolume = 0;
  let x = 0;
  let y = 0;
  let z = 0;
  let rowDepth = 0;
  let layerHeight = 0;

  const invalidQuantities = boxes.filter((box) => !Number.isInteger(Number(box.quantity)) || Number(box.quantity) <= 0);
  for (const box of invalidQuantities) {
    rejected.push({ ...box, boxId: `${box.id || box.name || "box"}-invalid`, reason: "Quantity must be a positive integer." });
  }
  const expandedBoxes = expandBoxes(boxes.filter((box) => !invalidQuantities.includes(box))).sort(
    (a, b) => (b.length * b.width * b.height) - (a.length * a.width * a.height)
  );

  for (const box of expandedBoxes) {
    if (![box.length, box.width, box.height].every((dimension) => Number.isFinite(dimension) && dimension > 0)) {
      rejected.push({ ...box, reason: "Box dimensions must be positive numbers." });
      continue;
    }

    if (!Number.isFinite(box.weight) || box.weight < 0) {
      rejected.push({ ...box, reason: "Weight must be zero or a positive number." });
      continue;
    }

    if (totalWeight + box.weight > maxWeight) {
      rejected.push({ ...box, reason: `Exceeds the vehicle weight limit of ${maxWeight} kg.` });
      continue;
    }

    if (box.width > vehicleWidth || box.length > vehicleLength || box.height > vehicleHeight) {
      rejected.push({ ...box, reason: "Box dimensions exceed the vehicle interior." });
      continue;
    }

    // Complete the current row before starting another one along the vehicle length.
    if (x + box.width > vehicleWidth) {
      y += rowDepth;
      x = 0;
      rowDepth = 0;
    }

    // Complete the current layer before starting another one upward.
    if (y + box.length > vehicleLength) {
      z += layerHeight;
      x = 0;
      y = 0;
      rowDepth = 0;
      layerHeight = 0;
    }

    if (z + box.height > vehicleHeight) {
      rejected.push({ ...box, reason: "No remaining vehicle space for this box." });
      continue;
    }

    const placement = {
      boxId: box.boxId,
      name: box.name,
      category: box.category,
      x,
      y,
      z,
      width: box.width,
      height: box.height,
      depth: box.length,
      // Short aliases retain compatibility with the shared BoxPlacement shape.
      w: box.width,
      h: box.height,
      d: box.length,
      weight: box.weight,
    };
    placements.push(placement);
    totalWeight += box.weight;
    usedVolume += box.width * box.length * box.height;
    x += box.width;
    rowDepth = Math.max(rowDepth, box.length);
    layerHeight = Math.max(layerHeight, box.height);
  }

  return {
    placements,
    rejected,
    volumeUtilized: vehicleVolume > 0 ? Math.round((usedVolume / vehicleVolume) * 100) : 0,
    totalWeight,
    fits: rejected.length === 0,
  };
}

// Strategy pattern: future algorithms (e.g. best-fit or priority-first) can
// be registered without changing CargoInputForm.
export const packingStrategies = Object.freeze({ shelf: shelfPacking });

export function optimize(vehicle = {}, boxes = [], strategy = "shelf") {
  const pack = packingStrategies[strategy];
  if (!pack) throw new Error(`Unknown packing strategy: ${strategy}`);
  return pack(vehicle, boxes);
}
