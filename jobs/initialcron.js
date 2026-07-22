// import "dotenv/config";
// import mongoose from "mongoose";
// import { syncSports } from "./Syncsports.job.js";
// import { syncCompetitions } from "./Synccompetitions.job.js";
// import { syncEvents } from "./Syncevents.job.js";
// import { syncMarkets } from "./Syncmarkets.job.js";
// import { syncOdds } from "./Syncodds.job.js";
// import { syncCricketFancyBookmaker } from "./Synccricketfancybookmaker.job.js";

// const run = async () => {
//   try {
//     console.log("Connecting to MongoDB...");
//     await mongoose.connect(
//       "mongodb+srv://bhaisiddharth63:9696607477@cluster0.um4bii2.mongodb.net/GAMING",
//     );
//     console.log("✅ MongoDB connected\n");

//     console.log("1/6 Syncing sports...");
//     await syncSports();

//     console.log("2/6 Syncing competitions...");
//     await syncCompetitions();

//     console.log("3/6 Syncing events...");
//     await syncEvents();

//     console.log("4/6 Syncing markets...");
//     await syncMarkets();

//     console.log("5/6 Syncing odds (match odds ladder)...");
//     await syncOdds();

//     console.log("6/6 Syncing cricket fancy + bookmaker...");
//     await syncCricketFancyBookmaker();

//     console.log(
//       "\n✅ All sync steps completed. Check your DB collections now.",
//     );
//   } catch (err) {
//     console.error("❌ Sync failed:", err.message);
//   } finally {
//     await mongoose.disconnect();
//     process.exit(0);
//   }
// };

// run();
