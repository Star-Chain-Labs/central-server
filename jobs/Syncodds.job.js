// import axios from "axios";
// import Market from "../models/Market.model.js";
// import Odds from "../models/Odds.model.js";

// const PROVIDER_BASE = "http://167.99.82.136/api/betfair";
// const client = axios.create({ baseURL: PROVIDER_BASE, timeout: 8000 });

// // listMarketBook accepts max 10 marketIds per call — chunk requests
// const chunk = (arr, size) => {
//   const out = [];
//   for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
//   return out;
// };

// export const syncOdds = async () => {
//   try {
//     // Only markets whose event is starting within the next 6 hours or already live —
//     // this is what needs true 1-second freshness, not everything in the DB.
//     const soon = new Date(Date.now() + 6 * 60 * 60 * 1000);
//     const markets = await Market.find({
//       marketName: "Match Odds",
//     });

//     if (markets.length === 0) return;

//     const marketIds = markets.map((m) => m.marketId);
//     const meta = Object.fromEntries(markets.map((m) => [m.marketId, m]));

//     const batches = chunk(marketIds, 10);
//     const bulkOps = [];

//     for (const batch of batches) {
//       try {
//         const { data } = await client.post("/listMarketBook", {
//           marketIds: batch,
//         });
//         const books = data?.data || data || [];

//         for (const book of Array.isArray(books) ? books : [books]) {
//           const m = meta[book.marketId];
//           if (!m) continue;

//           bulkOps.push({
//             updateOne: {
//               filter: { marketId: book.marketId },
//               update: {
//                 $set: {
//                   eventId: m.eventId,
//                   sportId: m.sportId,
//                   status: book.status || "OPEN",
//                   inPlay: !!book.inplay,
//                   totalMatched: book.totalMatched || 0,
//                   runners: (book.runners || []).map((r) => ({
//                     selectionId: r.selectionId,
//                     status: r.status || "ACTIVE",
//                     availableToBack: r.ex?.availableToBack || [],
//                     availableToLay: r.ex?.availableToLay || [],
//                   })),
//                   lastSyncedAt: new Date(),
//                 },
//               },
//               upsert: true,
//             },
//           });
//         }
//       } catch (batchErr) {
//         console.error("❌ [Odds Sync] batch failed:", batchErr.message);
//       }
//     }

//     if (bulkOps.length > 0) {
//       await Odds.bulkWrite(bulkOps);
//     }
//   } catch (err) {
//     console.error("❌ [Odds Sync] fatal error:", err.message);
//   }
// };

import axios from "axios";
import Market from "../models/Market.model.js";
import Odds from "../models/Odds.model.js";

const PROVIDER_BASE = "http://167.99.82.136/api/betfair";
const client = axios.create({ baseURL: PROVIDER_BASE, timeout: 8000 });

// listMarketBook accepts max 10 marketIds per call — chunk requests
const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export const syncOdds = async () => {
  try {
    // ✅ Sync ALL Match Odds markets - no time constraint
    // This ensures complete odds data for all events (past, present, future)
    const markets = await Market.find({
      marketName: "Match Odds",
    }).select("marketId eventId sportId");

    if (markets.length === 0) {
      return;
    }

    const marketIds = markets.map((m) => m.marketId);
    const meta = Object.fromEntries(markets.map((m) => [m.marketId, m]));

    const batches = chunk(marketIds, 10);

    let totalOdds = 0;
    let batchNum = 0;

    for (const batch of batches) {
      batchNum++;
      try {
        const { data } = await client.post("/listMarketBook", {
          marketIds: batch,
        });

        const books = data?.data || data || [];

        const bulkOps = [];

        for (const book of Array.isArray(books) ? books : [books]) {
          const m = meta[book.marketId];
          if (!m) continue;

          bulkOps.push({
            updateOne: {
              filter: { marketId: book.marketId },
              update: {
                $set: {
                  marketId: book.marketId,
                  eventId: m.eventId,
                  sportId: m.sportId,
                  status: book.status || "OPEN",
                  inPlay: !!book.inplay,
                  totalMatched: book.totalMatched || 0,
                  runners: (book.runners || []).map((r) => ({
                    selectionId: r.selectionId,
                    status: r.status || "ACTIVE",
                    availableToBack: r.ex?.availableToBack || [],
                    availableToLay: r.ex?.availableToLay || [],
                  })),
                  lastSyncedAt: new Date(),
                },
              },
              upsert: true,
            },
          });
        }

        if (bulkOps.length > 0) {
          const result = await Odds.bulkWrite(bulkOps);
          totalOdds += result.upsertedCount + result.modifiedCount;
        }
      } catch (batchErr) {}
    }
  } catch (err) {
    console.error("❌ [Odds Sync] fatal error:", err.message);
  }
};
