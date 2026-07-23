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
//     // ✅ Sync ALL Match Odds markets - no time constraint
//     // This ensures complete odds data for all events (past, present, future)
//     const markets = await Market.find({
//       marketName: "Match Odds",
//     }).select("marketId eventId sportId");

//     if (markets.length === 0) {
//       return;
//     }

//     const marketIds = markets.map((m) => m.marketId);
//     const meta = Object.fromEntries(markets.map((m) => [m.marketId, m]));

//     const batches = chunk(marketIds, 10);

//     let totalOdds = 0;
//     let batchNum = 0;

//     for (const batch of batches) {
//       batchNum++;
//       try {
//         const { data } = await client.post("/listMarketBook", {
//           marketIds: batch,
//         });

//         const books = data?.data || data || [];

//         const bulkOps = [];

//         for (const book of Array.isArray(books) ? books : [books]) {
//           const m = meta[book.marketId];
//           if (!m) continue;

//           bulkOps.push({
//             updateOne: {
//               filter: { marketId: book.marketId },
//               update: {
//                 $set: {
//                   marketId: book.marketId,
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

//         if (bulkOps.length > 0) {
//           const result = await Odds.bulkWrite(bulkOps);
//           totalOdds += result.upsertedCount + result.modifiedCount;
//         }
//       } catch (batchErr) {}
//     }
//   } catch (err) {
//     console.error("❌ [Odds Sync] fatal error:", err.message);
//   }
// };

import axios from "axios";
import Market from "../models/Market.model.js";
import Odds from "../models/Odds.model.js";

const PROVIDER_BASE = "http://167.99.82.136/api/betfair";

// ✅ FIX 1: timeout 800ms — isse zyada laga to data stale maana jayega
const client = axios.create({ baseURL: PROVIDER_BASE, timeout: 800 });

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

// ✅ FIX 2: Lock guard — pichla cycle khatam hue bina naya start nahi hoga
// Bina iske har second nayi call stack pe aati thi → race condition → wrong odds
let isRunning = false;

// ✅ FIX 3: Market cache — har second Mongo hit karne ki zarurat nahi
let marketMetaCache = {};
let marketCacheAt = 0;
const MARKET_CACHE_MS = 30000; // 30 seconds

const getMarketMeta = async () => {
  if (Date.now() - marketCacheAt < MARKET_CACHE_MS) return marketMetaCache;

  const markets = await Market.find({
    marketName: "Match Odds",
  })
    .select("marketId eventId sportId")
    .lean();

  marketMetaCache = Object.fromEntries(markets.map((m) => [m.marketId, m]));
  marketCacheAt = Date.now();
  return marketMetaCache;
};

export const syncOdds = async () => {
  // ✅ FIX 2: Agar pichla cycle abhi chal raha hai to skip karo
  if (isRunning) return;
  isRunning = true;

  const cycleStart = Date.now();

  try {
    const meta = await getMarketMeta();
    const marketIds = Object.keys(meta);

    if (marketIds.length === 0) return;

    const batches = chunk(marketIds, 10);

    // ✅ FIX 4: Saare batches PARALLEL (sequential nahi)
    // Sequential mein 25 batches × 800ms = 20 second lag rahe the
    // Parallel mein sab ek saath — sirf 1 round trip
    const results = await Promise.allSettled(
      batches.map((batch) =>
        client.post("/listMarketBook", { marketIds: batch }),
      ),
    );

    const bulkOps = [];

    for (const r of results) {
      // ✅ FIX 5: Timeout/error → skip this batch
      // Purana data overwrite nahi hoga — DB mein jo hai wo rahega
      // Controller mein lastSyncedAt check se SUSPENDED serve hoga
      if (r.status === "rejected") continue;

      const books = r.value.data?.data || r.value.data || [];

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
                runners: (book.runners || []).map((r2) => ({
                  selectionId: r2.selectionId,
                  status: r2.status || "ACTIVE",
                  availableToBack: r2.ex?.availableToBack || [],
                  availableToLay: r2.ex?.availableToLay || [],
                })),
                lastSyncedAt: new Date(), // 👈 Controller isko check karega staleness ke liye
              },
            },
            upsert: true,
          },
        });
      }
    }

    if (bulkOps.length > 0) {
      await Odds.bulkWrite(bulkOps);
    }

    const took = Date.now() - cycleStart;
    if (took > 900) {
      console.warn(`⚠️ [Odds Sync] Slow cycle: ${took}ms`);
    }
  } catch (err) {
    console.error("❌ [Odds Sync] fatal error:", err.message);
  } finally {
    isRunning = false;
  }
};
