import Sport from "../models/Sport.model.js";

// Provider doesn't have a "list all sports" endpoint in our postman collection,
// so we seed the known sport IDs we actually use. Add more here if the provider
// exposes new sportIds later.
const KNOWN_SPORTS = [
  { sportId: "4", name: "Cricket" },
  { sportId: "2", name: "Tennis" },
  { sportId: "1", name: "Soccer" },
];

export const syncSports = async () => {
  try {
    for (const sport of KNOWN_SPORTS) {
      await Sport.updateOne(
        { sportId: sport.sportId },
        { $set: { name: sport.name, isActive: true } },
        { upsert: true },
      );
    }
  } catch (err) {
    console.error("❌ [Sports Sync] error:", err.message);
  }
};
