import axios from "axios";
import Market from "../models/Market.model.js";
import Event from "../models/event.model.js";

const PROVIDER_BASE = process.env.CLIENT_API_URL;
const client = axios.create({ baseURL: PROVIDER_BASE, timeout: 15000 });

export const syncMarkets = async () => {
  try {
    // Only fetch markets for events that are live or starting within the next 24h —
    // no point burning API calls on events days away that don't have markets yet.
    const soon = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const events = await Event.find({ openDate: { $lte: soon } }).select(
      "eventId sportId name",
    );

    let totalMarkets = 0;

    for (const ev of events) {
      try {
        const { data } = await client.get(`/market-all-list/${ev.eventId}`);
        const markets = data || [];

        const ops = markets.map((m) => ({
          updateOne: {
            filter: { marketId: m.marketId },
            update: {
              $set: {
                eventId: ev.eventId,
                sportId: ev.sportId,
                marketName: m.marketName,
                runners: (m.runners || []).map((r) => ({
                  selectionId: r.selectionId,
                  runnerName: r.runnerName,
                  handicap: r.handicap || 0,
                  sortPriority: r.sortPriority || 0,
                })),
                totalMatched: m.totalMatched || 0,
                marketStartTime: m.marketStartTime
                  ? new Date(m.marketStartTime)
                  : undefined,
                lastSyncedAt: new Date(),
              },
            },
            upsert: true,
          },
        }));

        if (ops.length > 0) {
          await Market.bulkWrite(ops);
          totalMarkets += ops.length;
        }
      } catch (innerErr) {
        // one event's market list failing shouldn't stop the whole sync
      }
    }
  } catch (err) {
    // console.error("❌ [Markets Sync] fatal error:", err.message);
  }
};
