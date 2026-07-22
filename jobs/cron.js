// import "dotenv/config";
// import mongoose from "mongoose";
// import { syncSports } from "./Syncsports.job.js";
// import { syncCompetitions } from "./Synccompetitions.job.js";
// import { syncEvents } from "./Syncevents.job.js";
// import { syncMarkets } from "./Syncmarkets.job.js";
// import { syncOdds } from "./Syncodds.job.js";
// import { syncCricketFancyBookmaker } from "./Synccricketfancybookmaker.job.js";
// import cron from "node-cron";

// export const startSyncJobs = () => {
//   syncSports();

//   // 2) Competitions — every 60 minutes
//   cron.schedule("0 * * * *", syncCompetitions);

//   // 3) Events — every 12 minutes (within the 10-15 min window)
//   cron.schedule("*/12 * * * *", syncEvents);

//   // 4) Markets — every 6 minutes (within the 5-7 min window)
//   cron.schedule("*/6 * * * *", syncMarkets);

//   setInterval(syncOdds, 1000);

//   setInterval(syncCricketFancyBookmaker, 1000);

//   syncCompetitions();
//   syncEvents();
//   syncMarkets();

//   console.log(
//     "🔄 All sync jobs started (competitions:60m, events:12m, markets:6m, odds:1s, cricket-fancy:1s)",
//   );
// };

import "dotenv/config";
import mongoose from "mongoose";
import axios from "axios";
import cron from "node-cron";
import Sport from "../models/Sport.model.js";
import Competition from "../models/Competition.model.js";
import Event from "../models/event.model.js";
import Market from "../models/Market.model.js";
import Odds from "../models/Odds.model.js";
import CricketFancyOdds from "../models/Cricketfancyodds.model.js";
import { cleanupOldMatches } from "../controllers/deleteOldMatches.js";

const PROVIDER_BASE = "http://167.99.82.136/api/betfair";
const client = axios.create({ baseURL: PROVIDER_BASE, timeout: 15000 });

// ========== SYNC SPORTS ==========
export const syncSports = async () => {
  try {
    const sports = [
      { sportId: "4", name: "Cricket", key: "cricket", isActive: true },
      { sportId: "2", name: "Tennis", key: "tennis", isActive: true },
      { sportId: "1", name: "Soccer", key: "soccer", isActive: true },
    ];

    let inserted = 0,
      updated = 0;
    for (const sport of sports) {
      const result = await Sport.updateOne({ sportId: sport.sportId }, sport, {
        upsert: true,
      });
      inserted += result.upsertedCount || 0;
      updated += result.modifiedCount || 0;
    }
  } catch (err) {
    console.error("❌ [Sports Sync] FATAL ERROR:", err.message, err.stack);
  }
};

// ========== SYNC COMPETITIONS ==========
export const syncCompetitions = async () => {
  try {
    const sports = await Sport.find({ isActive: true });
    for (const sport of sports) {
      try {
        const { data } = await client.get(`/competition-list/${sport.sportId}`);
        const competitions = Array.isArray(data) ? data : [];
        if (competitions.length === 0) {
          continue;
        }

        const ops = competitions.map((c) => ({
          updateOne: {
            filter: {
              sportId: sport.sportId,
              competitionId: c.competition?.id || c.competitionId,
            },
            update: {
              $set: {
                competitionId: c.competition?.id || c.competitionId,
                sportId: sport.sportId,
                name: c.competition?.name || c.name || "Unknown",
                region: c.competitionRegion || c.region || "",
                marketCount: c.marketCount || 0,
                lastSyncedAt: new Date(),
              },
            },
            upsert: true,
          },
        }));

        const result = await Competition.bulkWrite(ops);
      } catch (innerErr) {
        console.error(
          `❌ [Competitions Sync] ${sport.name} failed:`,
          innerErr.message,
        );
      }
    }
  } catch (err) {
    console.error(
      "❌ [Competitions Sync] FATAL ERROR:",
      err.message,
      err.stack,
    );
  }
};

// ========== SYNC EVENTS ==========
export const syncEvents = async () => {
  try {
    const sports = await Sport.find({ isActive: true });

    for (const sport of sports) {
      try {
        const { data } = await client.get(`/event-list/${sport.sportId}`);
        const events = Array.isArray(data) ? data : [];

        if (events.length === 0) {
          continue;
        }

        const ops = events.map((e) => ({
          updateOne: {
            filter: { eventId: e.event?.id || e.eventId },
            update: {
              $set: {
                eventId: e.event?.id || e.eventId,
                sportId: sport.sportId,
                competitionId: e.competitionId || "",
                name: e.event?.name || e.name || "Unknown",
                countryCode: e.event?.countryCode || e.countryCode || "",
                timezone: e.event?.timezone || e.timezone || "",
                openDate: e.event?.openDate
                  ? new Date(e.event.openDate)
                  : new Date(),
                marketCount: e.marketCount || 0,
                isPremiumActive: e.isPremiumActive === "1" || false,
                lastSyncedAt: new Date(),
              },
            },
            upsert: true,
          },
        }));

        const result = await Event.bulkWrite(ops);
      } catch (innerErr) {
        console.error(
          `❌ [Events Sync] ${sport.name} failed:`,
          innerErr.message,
        );
      }
    }
  } catch (err) {
    console.error("❌ [Events Sync] FATAL ERROR:", err.message, err.stack);
  }
};

// ========== SYNC MARKETS ==========
export const syncMarkets = async () => {
  try {
    const soon = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const events = await Event.find({ openDate: { $lte: soon } }).select(
      "eventId sportId name",
    );

    let totalMarkets = 0;

    for (const ev of events) {
      try {
        const { data } = await client.get(`/market-all-list/${ev.eventId}`);
        const markets = Array.isArray(data) ? data : [];

        if (markets.length === 0) continue;

        const ops = markets.map((m) => ({
          updateOne: {
            filter: { marketId: m.marketId },
            update: {
              $set: {
                marketId: m.marketId,
                eventId: ev.eventId,
                sportId: ev.sportId,
                marketName: m.marketName || "Unknown",
                runners: (m.runners || []).map((r) => ({
                  selectionId: r.selectionId || 0,
                  runnerName: r.runnerName || "Unknown",
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

        const result = await Market.bulkWrite(ops);
        totalMarkets += result.upsertedCount + result.modifiedCount;
      } catch (innerErr) {
        console.error(
          `❌ [Markets Sync] Event ${ev.eventId} failed:`,
          innerErr.message,
        );
      }
    }
  } catch (err) {
    console.error("❌ [Markets Sync] FATAL ERROR:", err.message, err.stack);
  }
};

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export const syncOdds = async () => {
  try {
    const soon = new Date(Date.now() + 6 * 60 * 60 * 1000);
    const markets = await Market.find({
      marketName: "Match Odds",
      marketStartTime: { $lte: soon },
    }).select("marketId eventId sportId");

    if (markets.length === 0) {
      // console.log("ℹ️ [Odds Sync] No markets to update");
      return;
    }

    const marketIds = markets.map((m) => m.marketId);
    const meta = Object.fromEntries(markets.map((m) => [m.marketId, m]));

    const batches = chunk(marketIds, 10);
    let totalOdds = 0;

    for (const batch of batches) {
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
          // console.log(
          //   `  📝 Batch: Upserted ${result.upsertedCount}, Modified ${result.modifiedCount}`,
          // );
        }
      } catch (batchErr) {
        console.error("❌ [Odds Sync] Batch failed:", batchErr.message);
      }
    }

    // console.log(`✅ [Odds Sync] Complete - Total: ${totalOdds} odds synced`);
  } catch (err) {
    console.error("❌ [Odds Sync] FATAL ERROR:", err.message, err.stack);
  }
};

export const syncCricketFancyBookmaker = async () => {
  try {
    // ✅ REMOVED time constraint - sync ALL cricket events
    const events = await Event.find({
      sportId: "4",
    }).select("eventId");

    if (events.length === 0) {
      return;
    }

    const bulkOps = [];
    let totalFancy = 0;

    for (const ev of events) {
      // Sequential instead of parallel
      try {
        const { data } = await client.get(
          `/fancy-bookmaker-odds/${ev.eventId}`,
        );

        const rawFancy = data?.fancy || [];

        if (rawFancy.length === 0) continue;

        totalFancy += rawFancy.length;

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

        bulkOps.push({
          updateOne: {
            filter: { eventId: ev.eventId },
            update: {
              $set: {
                eventId: ev.eventId,
                fancy: fancy,
                lastSyncedAt: new Date(),
              },
            },
            upsert: true,
          },
        });
      } catch (innerErr) {
        console.error(`❌ Event ${ev.eventId}:`, innerErr.message);
      }
    }

    if (bulkOps.length > 0) {
      try {
        const result = await CricketFancyOdds.bulkWrite(bulkOps);
      } catch (bulkErr) {
        console.error("❌ BulkWrite failed:", bulkErr.message);
      }
    }
  } catch (err) {
    // console.error("❌ [Fancy Sync] FATAL:", err.message);
  }
};
export const startSyncJobs = () => {
  syncSports();

  cron.schedule("0 * * * *", syncCompetitions);
  cron.schedule("*/12 * * * *", syncEvents);
  cron.schedule("*/6 * * * *", syncMarkets);
  cron.schedule("0 0 * * *", cleanupOldMatches);
  setInterval(syncOdds, 1000);
  setInterval(syncCricketFancyBookmaker, 1000);
  syncCompetitions();
  syncEvents();
  syncMarkets();

  // console.log("\n✅ [Sync Manager] All jobs started!");
  // console.log("   Competitions: every 60 minutes");
  // console.log("   Events: every 12 minutes");
  // console.log("   Markets: every 6 minutes");
  // console.log("   Odds: every 1 second");
  // console.log("   Fancy: every 1 second\n");
};
