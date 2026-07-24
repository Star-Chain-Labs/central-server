import Event from "../models/event.model.js";
import Market from "../models/Market.model.js";
import Odds from "../models/Odds.model.js";
import CricketFancyOdds from "../models/Cricketfancyodds.model.js";
import cron from "node-cron";
import {
  oddsStore,
  fancyStore,
  marketMeta,
  eventToMarketId,
} from "../inmemory/Oddsstore.js";

export const cleanupOldMatches = async () => {
  try {
    // Get today's start and tomorrow's end
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    console.log(`🧹 [Cleanup] Removing matches before ${today.toISOString()}`);

    // Find old event IDs
    const oldEvents = await Event.find({
      openDate: { $lt: today },
    }).select("eventId");

    console.log(`  📊 Found ${oldEvents.length} old events to delete`);

    if (oldEvents.length === 0) {
      console.log("✅ [Cleanup] No old events to delete");
      return;
    }

    const eventIds = oldEvents.map((e) => e.eventId);

    // Delete events
    const eventResult = await Event.deleteMany({
      openDate: { $lt: today },
    });

    // Delete associated markets
    const marketResult = await Market.deleteMany({
      eventId: { $in: eventIds },
    });

    // Delete associated odds
    const oddsResult = await Odds.deleteMany({
      eventId: { $in: eventIds },
    });

    // Delete associated fancy
    const fancyResult = await CricketFancyOdds.deleteMany({
      eventId: { $in: eventIds },
    });

    console.log(`  ✅ Deleted ${eventResult.deletedCount} events`);
    console.log(`  ✅ Deleted ${marketResult.deletedCount} markets`);
    console.log(`  ✅ Deleted ${oddsResult.deletedCount} odds`);
    console.log(`  ✅ Deleted ${fancyResult.deletedCount} fancy records`);

    console.log(`✅ [Cleanup] Complete - Cleaned old matches from database`);
  } catch (err) {
    console.error("❌ [Cleanup] Error:", err.message);
  }
};

export const cleanupStaleEntries = () => {
  const now = Date.now();
  const MAX_AGE = 6 * 60 * 60 * 1000;

  let removed = { odds: 0, fancy: 0, meta: 0, evMap: 0 };

  for (const [k, v] of oddsStore.entries()) {
    if (now - v.ts > MAX_AGE) {
      oddsStore.delete(k);
      removed.odds++;
    }
  }
  for (const [k, v] of fancyStore.entries()) {
    if (now - v.ts > MAX_AGE) {
      fancyStore.delete(k);
      removed.fancy++;
    }
  }
  for (const [k] of marketMeta.entries()) {
    if (!oddsStore.has(k)) {
      marketMeta.delete(k);
      removed.meta++;
    }
  }
  for (const [eventId, marketId] of eventToMarketId.entries()) {
    if (!marketMeta.has(marketId)) {
      eventToMarketId.delete(eventId);
      removed.evMap++;
    }
  }

  if (removed.odds + removed.fancy + removed.meta + removed.evMap > 0) {
    console.log(`🧹 [Cleanup]`, removed);
  }
};
