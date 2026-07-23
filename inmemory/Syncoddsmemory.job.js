// jobs/Syncodds.job.js
import axios from "axios";
import Market from "../models/Market.model.js";
import {
  setOdds,
  setMarketMeta,
  setEventMarket,
  getAllMarketMeta,
} from "./Oddsstore.js";

const PROVIDER_BASE = "http://167.99.82.136/api/betfair";

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

// ============= CRICKET =============
const cricketClient = axios.create({ baseURL: PROVIDER_BASE, timeout: 1000 });
let cricketRunning = false;
let cricketCacheAt = 0;
const CRICKET_CACHE_MS = 30000;

const loadCricketMarkets = async () => {
  if (Date.now() - cricketCacheAt < CRICKET_CACHE_MS) return;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(todayStart);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 2);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const markets = await Market.find({
    marketName: "Match Odds",
    sportId: "4",
    marketStartTime: { $gte: todayStart, $lte: tomorrowEnd },
  }).lean();

  for (const m of markets) {
    setMarketMeta(m.marketId, {
      marketId: m.marketId,
      eventId: m.eventId,
      sportId: m.sportId,
      runners: m.runners,
    });
    setEventMarket(m.eventId, m.marketId);
  }

  cricketCacheAt = Date.now();
  console.log(`♻️ [Cricket] Loaded ${markets.length} markets into memory`);
};

export const syncCricketOdds = async () => {
  if (cricketRunning) return;
  cricketRunning = true;

  const start = Date.now();
  try {
    await loadCricketMarkets();

    const meta = getAllMarketMeta();
    const cricketIds = [...meta.entries()]
      .filter(([, v]) => v.sportId === "4")
      .map(([k]) => k);

    if (cricketIds.length === 0) return;

    const batches = chunk(cricketIds, 10);

    const results = await Promise.allSettled(
      batches.map((batch) =>
        cricketClient.post("/listMarketBook", { marketIds: batch }),
      ),
    );

    for (const r of results) {
      if (r.status === "rejected") continue;

      const books = r.value.data?.data || r.value.data || [];
      for (const book of Array.isArray(books) ? books : [books]) {
        const m = meta.get(book.marketId);
        if (!m) continue;

        // ✅ DB nahi — Memory mein save
        setOdds(book.marketId, {
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
        });
      }
    }

    const took = Date.now() - start;
    if (took > 1500) console.warn(`⚠️ [Cricket Odds] Slow: ${took}ms`);
  } catch (err) {
    console.error("❌ [Cricket Odds]", err.message);
  } finally {
    cricketRunning = false;
  }
};

// ============= TENNIS + SOCCER =============
const otherClient = axios.create({ baseURL: PROVIDER_BASE, timeout: 1800 });
let otherRunning = false;
let otherCacheAt = 0;
const OTHER_CACHE_MS = 30000;

const loadOtherMarkets = async () => {
  if (Date.now() - otherCacheAt < OTHER_CACHE_MS) return;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(todayStart);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 2);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const markets = await Market.find({
    marketName: "Match Odds",
    sportId: { $in: ["1", "2"] }, // Tennis + Soccer
    marketStartTime: { $gte: todayStart, $lte: tomorrowEnd },
  }).lean();

  for (const m of markets) {
    setMarketMeta(m.marketId, {
      marketId: m.marketId,
      eventId: m.eventId,
      sportId: m.sportId,
      runners: m.runners,
    });
    setEventMarket(m.eventId, m.marketId);
  }

  otherCacheAt = Date.now();
  console.log(
    `♻️ [Tennis+Soccer] Loaded ${markets.length} markets into memory`,
  );
};

export const syncOtherOdds = async () => {
  if (otherRunning) return;
  otherRunning = true;

  const start = Date.now();
  try {
    await loadOtherMarkets();

    const meta = getAllMarketMeta();
    const otherIds = [...meta.entries()]
      .filter(([, v]) => v.sportId === "1" || v.sportId === "2")
      .map(([k]) => k);

    if (otherIds.length === 0) return;

    const batches = chunk(otherIds, 10);

    const results = await Promise.allSettled(
      batches.map((batch) =>
        otherClient.post("/listMarketBook", { marketIds: batch }),
      ),
    );

    for (const r of results) {
      if (r.status === "rejected") continue;

      const books = r.value.data?.data || r.value.data || [];
      for (const book of Array.isArray(books) ? books : [books]) {
        const m = meta.get(book.marketId);
        if (!m) continue;

        // ✅ Memory mein save
        setOdds(book.marketId, {
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
        });
      }
    }

    const took = Date.now() - start;
    if (took > 2000) console.warn(`⚠️ [Other Odds] Slow: ${took}ms`);
  } catch (err) {
    console.error("❌ [Other Odds]", err.message);
  } finally {
    otherRunning = false;
  }
};
