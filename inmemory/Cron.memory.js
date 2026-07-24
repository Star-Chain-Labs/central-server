// jobs/cron.js
import "dotenv/config";
import axios from "axios";
import cron from "node-cron";
import Sport from "../models/Sport.model.js";
import Competition from "../models/Competition.model.js";
import Event from "../models/event.model.js";
import Market from "../models/Market.model.js";
import { syncCricketOdds, syncOtherOdds } from "./Syncoddsmemory.job.js";
import { syncCricketFancyBookmaker } from "./Syncfancymemory.job.js";
import {
  cleanupOldMatches,
  cleanupStaleEntries,
} from "../controllers/deleteOldMatches.js";
const PROVIDER_BASE = process.env.CLIENT_API_URL;
const client = axios.create({ baseURL: PROVIDER_BASE, timeout: 15000 });
export const syncSports = async () => {
  try {
    const sports = [
      { sportId: "4", name: "Cricket", key: "cricket", isActive: true },
      { sportId: "2", name: "Tennis", key: "tennis", isActive: true },
      { sportId: "1", name: "Soccer", key: "soccer", isActive: true },
    ];
    for (const sport of sports) {
      await Sport.updateOne({ sportId: sport.sportId }, sport, {
        upsert: true,
      });
    }
  } catch (err) {
    console.error("❌ [Sports Sync]", err.message);
  }
};

export const syncCompetitions = async () => {
  try {
    const sports = await Sport.find({ isActive: true });
    for (const sport of sports) {
      try {
        const { data } = await client.get(`/competition-list/${sport.sportId}`);
        const competitions = Array.isArray(data) ? data : [];
        if (competitions.length === 0) continue;

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
        await Competition.bulkWrite(ops);
      } catch (innerErr) {
        console.error(`❌ [Competitions] ${sport.name}:`, innerErr.message);
      }
    }
  } catch (err) {
    console.error("❌ [Competitions Sync]", err.message);
  }
};

export const syncEvents = async () => {
  try {
    const sports = await Sport.find({ isActive: true });
    for (const sport of sports) {
      try {
        const { data } = await client.get(`/event-list/${sport.sportId}`);
        const events = Array.isArray(data) ? data : [];
        if (events.length === 0) continue;

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
        await Event.bulkWrite(ops);
      } catch (innerErr) {
        console.error(`❌ [Events] ${sport.name}:`, innerErr.message);
      }
    }
  } catch (err) {
    console.error("❌ [Events Sync]", err.message);
  }
};

export const syncMarkets = async () => {
  try {
    const soon = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const events = await Event.find({ openDate: { $lte: soon } }).select(
      "eventId sportId",
    );

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
        await Market.bulkWrite(ops);
      } catch (innerErr) {}
    }
  } catch (err) {}
};

export const startSyncJobs = () => {
  syncSports();

  cron.schedule("0 * * * *", syncCompetitions);
  cron.schedule("*/12 * * * *", syncEvents);
  cron.schedule("*/6 * * * *", syncMarkets);
  cron.schedule("0 0 * * *", cleanupOldMatches);
  setInterval(cleanupStaleEntries, 5 * 60 * 1000);

  setInterval(syncCricketOdds, 1000);

  setInterval(syncOtherOdds, 2000);

  setInterval(syncCricketFancyBookmaker, 1000);

  syncCompetitions();
  syncEvents();
  syncMarkets();

  console.log("✅ All sync jobs started!");
  console.log("   Cricket Odds: 1s | Tennis+Soccer: 2s | Fancy: 1s");
};
