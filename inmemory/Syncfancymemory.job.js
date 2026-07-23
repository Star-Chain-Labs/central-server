// // jobs/Syncfancy.job.js
// import axios from "axios";
// import Event from "../models/event.model.js";
// import { setFancy } from "./Oddsstore.js";

// const PROVIDER_BASE = "http://167.99.82.136/api/betfair";
// const client = axios.create({ baseURL: PROVIDER_BASE, timeout: 1500 });

// let isRunning = false;
// let eventCache = [];
// let eventCacheAt = 0;
// const EVENT_CACHE_MS = 60000;

// const getCricketEvents = async () => {
//   if (Date.now() - eventCacheAt < EVENT_CACHE_MS) return eventCache;

//   const todayStart = new Date();
//   todayStart.setHours(0, 0, 0, 0);
//   const tomorrowEnd = new Date(todayStart);
//   tomorrowEnd.setDate(tomorrowEnd.getDate() + 2);
//   tomorrowEnd.setHours(23, 59, 59, 999);

//   const events = await Event.find({
//     sportId: "4",
//     openDate: { $gte: todayStart, $lte: tomorrowEnd },
//   })
//     .select("eventId")
//     .lean();

//   eventCache = events;
//   eventCacheAt = Date.now();
//   console.log(`♻️ [Fancy] Loaded ${events.length} events into cache`);
//   return eventCache;
// };

// export const syncCricketFancyBookmaker = async () => {
//   if (isRunning) return;
//   isRunning = true;

//   const start = Date.now();
//   try {
//     const events = await getCricketEvents();
//     if (events.length === 0) return;

//     // ✅ Saare events PARALLEL
//     const results = await Promise.allSettled(
//       events.map((ev) =>
//         client
//           .get(`/fancy-bookmaker-odds/${ev.eventId}`)
//           .then((r) => ({ eventId: ev.eventId, data: r.data })),
//       ),
//     );

//     for (const r of results) {
//       if (r.status === "rejected") continue;

//       const { eventId, data } = r.value;
//       const rawFancy = data?.fancy || [];
//       if (rawFancy.length === 0) continue;

//       const fancy = rawFancy.map((f) => {
//         const item = typeof f === "string" ? JSON.parse(f) : f;
//         return {
//           selectionId: String(item.SelectionId || "0"),
//           runnerName: item.RunnerName || "",
//           gtype: item.gtype || "other",
//           backPrice: item.BackPrice1 || 0,
//           backSize: item.BackSize1 || 0,
//           layPrice: item.LayPrice1 || 0,
//           laySize: item.LaySize1 || 0,
//           min: item.min || 100,
//           max: item.max || 50000,
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

//       // ✅ DB nahi — Memory mein save
//       setFancy(eventId, { eventId, bookmaker, fancy });
//     }

//     const took = Date.now() - start;
//     if (took > 2000) console.warn(`⚠️ [Fancy Sync] Slow: ${took}ms`);
//   } catch (err) {
//     console.error("❌ [Fancy Sync]", err.message);
//   } finally {
//     isRunning = false;
//   }
// };

// jobs/Syncfancy.job.js
import axios from "axios";
import Event from "../models/event.model.js";
import { setFancy } from "./Oddsstore.js";
import { broadcastFancy } from "../socket/Socketserver.js";

const PROVIDER_BASE = "http://167.99.82.136/api/betfair";
const client = axios.create({ baseURL: PROVIDER_BASE, timeout: 1500 });

let isRunning = false;
let eventCache = [];
let eventCacheAt = 0;
const EVENT_CACHE_MS = 60000;

const getCricketEvents = async () => {
  if (Date.now() - eventCacheAt < EVENT_CACHE_MS) return eventCache;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(todayStart);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 2);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const events = await Event.find({
    sportId: "4",
    openDate: { $gte: todayStart, $lte: tomorrowEnd },
  })
    .select("eventId")
    .lean();

  eventCache = events;
  eventCacheAt = Date.now();
  console.log(`♻️ [Fancy] Loaded ${events.length} events into cache`);
  return eventCache;
};

export const syncCricketFancyBookmaker = async () => {
  if (isRunning) return;
  isRunning = true;

  const start = Date.now();
  try {
    const events = await getCricketEvents();
    if (events.length === 0) return;

    // ✅ Saare events PARALLEL
    const results = await Promise.allSettled(
      events.map((ev) =>
        client
          .get(`/fancy-bookmaker-odds/${ev.eventId}`)
          .then((r) => ({ eventId: ev.eventId, data: r.data })),
      ),
    );

    for (const r of results) {
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

      const fancyData = { eventId, bookmaker, fancy };

      // ✅ Memory mein save
      setFancy(eventId, fancyData);

      // ✅ WebSocket broadcast
      broadcastFancy(eventId, fancyData);
    }

    const took = Date.now() - start;
    if (took > 2000) console.warn(`⚠️ [Fancy Sync] Slow: ${took}ms`);
  } catch (err) {
    console.error("❌ [Fancy Sync]", err.message);
  } finally {
    isRunning = false;
  }
};
