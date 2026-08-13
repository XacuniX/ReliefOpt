/**
 * SHARED DATA SHAPES — do not change without telling the whole team.
 */

/**
 * @typedef {Object} UrgencyResult   // produced by NFT's src/lib/urgency.js
 * @property {number} totalScore     // 0-100
 * @property {"green"|"amber"|"red"} zone
 * @property {{label: string, value: string, points: number}[]} factors
 */

/**
 * @typedef {Object} VoiceExtraction // produced by RKN's src/lib/extract.js
 * @property {string} transcript
 * @property {string} language       // "bn" | "en"
 * @property {string|null} location  // must match a key in mockData.cityCoords
 * @property {number|null} waterLevelFt
 * @property {number|null} peopleCount
 * @property {boolean} childrenPresent
 * @property {boolean} elderlyPresent
 * @property {number|null} daysWithoutFood
 */

/**
 * @typedef {Object} SyncQueueEntry  // produced by RKN's src/lib/sync.js
 * @property {string} id
 * @property {string} actionType     // "ADD_REPORT" | "UPDATE_ITEM_QTY" | "MOVE_TASK" | ...
 * @property {Object} payload        // a real object, NOT a display string
 * @property {"Queued"|"Syncing"|"Failed"|"Done"} status
 * @property {string} timestamp      // ISO string
 */

/**
 * @typedef {Object} BoxPlacement    // produced by NFT's src/lib/packing.js
 * @property {string} boxId
 * @property {string} name
 * @property {string} category
 * @property {number} x  @property {number} y  @property {number} z   // cm, corner position
 * @property {number} w  @property {number} h  @property {number} d   // cm, size
 */

export {};
