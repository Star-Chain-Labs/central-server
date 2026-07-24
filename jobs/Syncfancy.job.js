// import axios from "axios";
// import Event from "../models/event.model.js";
// import redis, { FANCY_TTL_MS } from "../config/redis.js";

// const PROVIDER_BASE = process.env.CLIENT_API_URL
// const client = axios.create({ baseURL: PROVIDER_BASE, timeout: 900 });

// let isRunning = false;

// // Event list cache — 60s
// let eventCache = [];
// let eventCacheAt = 0;
// const EVENT_CACHE_MS = 60000;

// const getCricketEvents = async () => {
//   if (Date.now() - eventCacheAt < EVENT_CACHE_MS) return eventCache;

//   // Sirf aaj + kal ke events — purane matches par API calls waste mat karo
//   const from = new Date();
//   from.setHours(0, 0, 0, 0);
//   const to = new Date(from);
//   to.setDate(to.getDate() + 2);

//   const events = await Event.find({
//     sportId: "4",
//     openDate: { $gte: from, $lte: to },
//   })
//     .select("eventId")
//     .lean();

//   eventCache = events.map((e) => e.eventId);
//   eventCacheAt = Date.now();
//   console.log(`♻️ [Fancy] Event cache refreshed: ${eventCache.length} events`);
//   return eventCache;
// };

// export const syncCricketFancyBookmaker = async () => {
//   if (isRunning) return;
//   isRunning = true;

//   const cycleStart = Date.now();

//   try {
//     const eventIds = await getCricketEvents();
//     if (eventIds.length === 0) return;

//     // Saare events PARALLEL
//     const results = await Promise.allSettled(
//       eventIds.map((id) =>
//         client
//           .get(`/fancy-bookmaker-odds/${id}`)
//           .then((r) => ({ eventId: id, data: r.data })),
//       ),
//     );

//     const pipeline = redis.multi();
//     let written = 0;
//     let failed = 0;
//     const now = Date.now();

//     for (const r of results) {
//       if (r.status === "rejected") {
//         failed++;
//         continue; // timeout → write skip → TTL expire → SUSPENDED
//       }

//       const { eventId, data } = r.value;

//       const fancy = (data?.fancy || []).map((f) => {
//         const item = typeof f === "string" ? JSON.parse(f) : f;
//         return {
//           selectionId: String(item.SelectionId),
//           runnerName: item.RunnerName,
//           gtype: item.gtype,
//           backPrice: item.BackPrice1 || 0,
//           backSize: item.BackSize1 || 0,
//           layPrice: item.LayPrice1 || 0,
//           laySize: item.LaySize1 || 0,
//           min: item.min || 100,
//           max: item.max || 25000,
//           remark: item.rem || "",
//         };
//       });

//       const bookmaker = (data?.bookmaker || []).map((bm) => ({
//         sid: bm.sid,
//         nat: bm.nat,
//         b1: bm.b1,
//         bs1: bm.bs1,
//         l1: bm.l1,
//         ls1: bm.ls1,
//         min: bm.min,
//         max: bm.max,
//         status: bm.s,
//       }));

//       pipeline.set(
//         `fancy:${eventId}`,
//         JSON.stringify({ eventId, bookmaker, fancy, ts: now }),
//         { PX: FANCY_TTL_MS },
//       );
//       written++;
//     }

//     if (written > 0) await pipeline.exec();

//     const took = Date.now() - cycleStart;
//     if (failed > 0 || took > 1000) {
//       console.log(
//         `⚠️ [Fancy] ${took}ms | written:${written} | failed:${failed}/${eventIds.length}`,
//       );
//     }
//   } catch (err) {
//     console.error("❌ [Fancy Sync]", err.message);
//   } finally {
//     isRunning = false;
//   }
// };

import axios from "axios";
import Event from "../models/event.model.js";
import CricketFancyOdds from "../models/Cricketfancyodds.model.js";

const PROVIDER_BASE = process.env.CLIENT_API_URL;

// ✅ FIX 1: timeout 900ms
const client = axios.create({ baseURL: PROVIDER_BASE, timeout: 900 });

// ✅ FIX 2: Lock guard
let isRunning = false;

// ✅ FIX 3: Event cache — 60 seconds
let eventCache = [];
let eventCacheAt = 0;
const EVENT_CACHE_MS = 60000;

const getCricketEvents = async () => {
  if (Date.now() - eventCacheAt < EVENT_CACHE_MS) return eventCache;

  // Sirf aaj aur kal ke events — purane par API calls waste
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 2);

  const events = await Event.find({
    sportId: "4",
    openDate: { $gte: from, $lte: to },
  })
    .select("eventId")
    .lean();

  eventCache = events;
  eventCacheAt = Date.now();
  return eventCache;
};

export const syncCricketFancyBookmaker = async () => {
  // ✅ FIX 2: Skip if already running
  if (isRunning) return;
  isRunning = true;

  const cycleStart = Date.now();

  try {
    const events = await getCricketEvents();

    if (events.length === 0) return;

    // ✅ FIX 4: Saare events PARALLEL (sequential nahi)
    const results = await Promise.allSettled(
      events.map((ev) =>
        client
          .get(`/fancy-bookmaker-odds/${ev.eventId}`)
          .then((r) => ({ eventId: ev.eventId, data: r.data })),
      ),
    );

    const bulkOps = [];

    for (const r of results) {
      // ✅ FIX 5: Timeout → skip (purana data DB mein rahega, lastSyncedAt se detect hoga)
      if (r.status === "rejected") continue;

      const { eventId, data } = r.value;
      const rawFancy = data?.fancy || [];

      if (rawFancy.length === 0) continue;

      const fancy = rawFancy.map((f) => {
        const item = typeof f === "string" ? JSON.parse(f) : f;
        return {
          selectionId: String(item.SelectionId || "0"),
          runnerName: item.RunnerName || "",
          gtype: item.gtype || "other",
          backPrice: item.BackPrice1 || 0,
          backSize: item.BackSize1 || 0,
          layPrice: item.LayPrice1 || 0,
          laySize: item.LaySize1 || 0,
          min: item.min || 100,
          max: item.max || 50000,
          remark: item.rem || "",
        };
      });

      const bookmaker = (data?.bookmaker || []).map((bm) => ({
        sid: bm.sid,
        nat: bm.nat,
        b1: bm.b1,
        bs1: bm.bs1,
        l1: bm.l1,
        ls1: bm.ls1,
        min: bm.min,
        max: bm.max,
        status: bm.s,
      }));

      bulkOps.push({
        updateOne: {
          filter: { eventId },
          update: {
            $set: {
              eventId,
              bookmaker,
              fancy,
              lastSyncedAt: new Date(), // 👈 Staleness detection ke liye
            },
          },
          upsert: true,
        },
      });
    }

    if (bulkOps.length > 0) {
      await CricketFancyOdds.bulkWrite(bulkOps);
    }

    const took = Date.now() - cycleStart;
    if (took > 1000) {
      console.warn(`⚠️ [Fancy Sync] Slow cycle: ${took}ms`);
    }
  } catch (err) {
    console.error("❌ [Fancy Sync] fatal error:", err.message);
  } finally {
    // ✅ FIX 2: Unlock
    isRunning = false;
  }
};
