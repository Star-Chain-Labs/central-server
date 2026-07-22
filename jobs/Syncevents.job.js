import axios from "axios";
import Sport from "../models/Sport.model.js";
import Event from "../models/event.model.js";
const PROVIDER_BASE = "http://167.99.82.136/api/betfair";
const client = axios.create({ baseURL: PROVIDER_BASE, timeout: 15000 });
export const syncEvents = async () => {
  try {
    const sports = await Sport.find({ isActive: true });

    for (const sport of sports) {
      try {
        const { data } = await client.get(`/event-list/${sport.sportId}`);
        const events = data || [];

        const ops = events.map((e) => ({
          updateOne: {
            filter: { eventId: e.event.id },
            update: {
              $set: {
                sportId: sport.sportId,
                name: e.event.name,
                countryCode: e.event.countryCode || "",
                timezone: e.event.timezone || "",
                openDate: new Date(e.event.openDate),
                marketCount: e.marketCount || 0,
                isPremiumActive: e.isPremiumActive === "1",
                lastSyncedAt: new Date(),
              },
            },
            upsert: true,
          },
        }));

        if (ops.length > 0) {
          await Event.bulkWrite(ops);
        }

        console.log(
          `✅ [Events Sync] ${sport.name} (${sport.sportId}) — ${events.length} events`,
        );
      } catch (innerErr) {
        console.error(
          `❌ [Events Sync] ${sport.name} failed:`,
          innerErr.message,
        );
      }
    }
  } catch (err) {
    console.error("❌ [Events Sync] fatal error:", err.message);
  }
};
