import "dotenv/config";
import mongoose from "mongoose";
import { syncSports } from "./Syncsports.job.js";
import { syncCompetitions } from "./Synccompetitions.job.js";
import { syncEvents } from "./Syncevents.job.js";
import { syncMarkets } from "./Syncmarkets.job.js";
import { syncOdds } from "./Syncodds.job.js";
import { syncCricketFancyBookmaker } from "./Synccricketfancybookmaker.job.js";
import cron from "node-cron";
/Users/siddhu/Desktop/betting-backend-old/betting-backend/src/syncData/initialcron.js
export const startSyncJobs = () => {
  syncSports();

  // 2) Competitions — every 60 minutes
  cron.schedule("0 * * * *", syncCompetitions);

  // 3) Events — every 12 minutes (within the 10-15 min window)
  cron.schedule("*/12 * * * *", syncEvents);

  // 4) Markets — every 6 minutes (within the 5-7 min window)
  cron.schedule("*/6 * * * *", syncMarkets);

  setInterval(syncOdds, 1000);

  setInterval(syncCricketFancyBookmaker, 1000);

  syncCompetitions();
  syncEvents();
  syncMarkets();

  console.log(
    "🔄 All sync jobs started (competitions:60m, events:12m, markets:6m, odds:1s, cricket-fancy:1s)",
  );
};
