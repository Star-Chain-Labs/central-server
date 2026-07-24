// import axios from "axios";
// import Event from "../models/event.model.js";
// import { setFancy } from "./Oddsstore.js";
// import { broadcastFancy } from "../socket/Socketserver.js";

// const PROVIDER_BASE = process.env.CLIENT_API_URL;
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

//       const fancyData = { eventId, bookmaker, fancy };

//       // ✅ Memory mein save
//       setFancy(eventId, fancyData);

//       // ✅ WebSocket broadcast
//       broadcastFancy(eventId, fancyData);
//     }

//     const took = Date.now() - start;
//     if (took > 2000) console.warn(`⚠️ [Fancy Sync] Slow: ${took}ms`);
//   } catch (err) {
//     console.error("❌ [Fancy Sync]", err.message);
//   } finally {
//     isRunning = false;
//   }
// };

import axios from "axios";
import Event from "../models/event.model.js";
import { setFancy } from "./Oddsstore.js";
import { broadcastFancy } from "../socket/Socketserver.js";

const PROVIDER_BASE = process.env.CLIENT_API_URL;
const client = axios.create({ baseURL: PROVIDER_BASE, timeout: 2500 });

let isRunning = false;
let eventCache = [];
let eventCacheAt = 0;
const EVENT_CACHE_MS = 60000;

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

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

    // ✅ Batched parallel — 10 at a time (provider ko overwhelm nahi kare)
    const batches = chunk(events, 10);
    const allResults = [];

    for (const batch of batches) {
      const results = await Promise.allSettled(
        batch.map((ev) =>
          client
            .get(`/fancy-bookmaker-odds/${ev.eventId}`)
            .then((r) => ({ eventId: ev.eventId, data: r.data })),
        ),
      );
      allResults.push(...results);
    }

    for (const r of allResults) {
      if (r.status === "rejected") continue;

      const { eventId, data } = r.value;
      const rawFancy = data?.fancy || [];
      const rawBookmaker = data?.bookmaker || [];

      // ✅ Full fancy mapping — GameStatus, sr_no, ballsess sab preserve
      const fancy = rawFancy.map((f) => {
        const item = typeof f === "string" ? JSON.parse(f) : f;
        return {
          selectionId: String(item.SelectionId || "0"),
          runnerName: item.RunnerName || "",
          gtype: item.gtype || "other",
          // Prices — Level 1
          backPrice: Number(item.BackPrice1) || 0,
          backSize: Number(item.BackSize1) || 0,
          layPrice: Number(item.LayPrice1) || 0,
          laySize: Number(item.LaySize1) || 0,
          // Prices — Level 2
          backPrice2: Number(item.BackPrice2) || 0,
          backSize2: Number(item.BackSize2) || 0,
          layPrice2: Number(item.LayPrice2) || 0,
          laySize2: Number(item.LaySize2) || 0,
          // Prices — Level 3
          backPrice3: Number(item.BackPrice3) || 0,
          backSize3: Number(item.BackSize3) || 0,
          layPrice3: Number(item.LayPrice3) || 0,
          laySize3: Number(item.LaySize3) || 0,
          // Limits
          min: Number(item.min) || 100,
          max: Number(item.max) || 50000,
          // Meta
          gameStatus: item.GameStatus || "",
          remark: item.rem || "",
          srNo: Number(item.sr_no) || 0,
          ballsess: Number(item.ballsess) || 1,
        };
      });

      // ✅ Full bookmaker mapping — mid, level 2/3, gtype sab preserve
      const bookmaker = rawBookmaker.map((bm) => ({
        mid: bm.mid || "",
        mname: bm.mname || "Bookmaker",
        sid: String(bm.sid || ""),
        nat: bm.nat || "",
        // Level 1
        b1: bm.b1 || "0.00",
        bs1: bm.bs1 || "0.00",
        l1: bm.l1 || "0.00",
        ls1: bm.ls1 || "0.00",
        // Level 2
        b2: bm.b2 || "0.00",
        bs2: bm.bs2 || "0.00",
        l2: bm.l2 || "0.00",
        ls2: bm.ls2 || "0.00",
        // Level 3
        b3: bm.b3 || "0.00",
        bs3: bm.bs3 || "0.00",
        l3: bm.l3 || "0.00",
        ls3: bm.ls3 || "0.00",
        // Limits & meta
        min: bm.min || "100",
        max: bm.max || "50000",
        status: bm.s || "ACTIVE",
        gtype: bm.gtype || "Match1",
        remark: bm.remark || "",
      }));

      const fancyData = { eventId, bookmaker, fancy };

      setFancy(eventId, fancyData);
      broadcastFancy(eventId, fancyData);
    }

    const took = Date.now() - start;
    if (took > 2500) console.warn(`⚠️ [Fancy Sync] Slow: ${took}ms`);
  } catch (err) {
    console.error("❌ [Fancy Sync]", err.message);
  } finally {
    isRunning = false;
  }
};
