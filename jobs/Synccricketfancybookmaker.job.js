// import axios from "axios";
// import CricketFancyOdds from "../models/Cricketfancyodds.model.js";
// import Event from "../models/event.model.js";

// const PROVIDER_BASE = "http://167.99.82.136/api/betfair";
// const client = axios.create({ baseURL: PROVIDER_BASE, timeout: 8000 });

// export const syncCricketFancyBookmaker = async () => {
//   try {
//     const soon = new Date(Date.now() + 6 * 60 * 60 * 1000);
//     const events = await Event.find({
//       sportId: "4",
//       openDate: { $lte: soon },
//     }).select("eventId");

//     if (events.length === 0) return;

//     const bulkOps = [];

//     // Fire all requests in parallel — 1s interval demands speed over sequential safety
//     await Promise.all(
//       events.map(async (ev) => {
//         try {
//           const { data } = await client.get(
//             `/fancy-bookmaker-odds/${ev.eventId}`,
//           );

//           const rawFancy = data?.fancy || [];
//           const fancy = rawFancy.map((f) => {
//             const item = typeof f === "string" ? JSON.parse(f) : f;
//             return {
//               selectionId: String(item.SelectionId),
//               runnerName: item.RunnerName,
//               gtype: item.gtype,
//               backPrice: item.BackPrice1,
//               backSize: item.BackSize1,
//               layPrice: item.LayPrice1,
//               laySize: item.LaySize1,
//               min: item.min,
//               max: item.max,
//               remark: item.rem || "",
//             };
//           });

//           const bookmaker = (data?.bookmaker || []).map((bm) => ({
//             sid: bm.sid,
//             nat: bm.nat,
//             b1: bm.b1,
//             bs1: bm.bs1,
//             l1: bm.l1,
//             ls1: bm.ls1,
//             min: bm.min,
//             max: bm.max,
//             status: bm.s,
//           }));

//           bulkOps.push({
//             updateOne: {
//               filter: { eventId: ev.eventId },
//               update: {
//                 $set: { bookmaker, fancy, lastSyncedAt: new Date() },
//               },
//               upsert: true,
//             },
//           });
//         } catch (innerErr) {
//           // one event failing shouldn't block others in this 1s cycle
//         }
//       }),
//     );

//     if (bulkOps.length > 0) {
//       await CricketFancyOdds.bulkWrite(bulkOps);
//     }
//   } catch (err) {
//     console.error(
//       "❌ [Cricket Fancy/Bookmaker Sync] fatal error:",
//       err.message,
//     );
//   }
// };

import axios from "axios";
import CricketFancyOdds from "../models/Cricketfancyodds.model.js";
import Event from "../models/event.model.js";

const PROVIDER_BASE = "http://167.99.82.136/api/betfair";
const client = axios.create({ baseURL: PROVIDER_BASE, timeout: 8000 });

export const syncCricketFancyBookmaker = async () => {
  try {
    // ✅ Sync ALL cricket events - no time constraint
    // This ensures complete fancy odds data for all cricket events
    const events = await Event.find({
      sportId: "4",
    }).select("eventId");

    console.log(`🟡 [Fancy Sync] Found ${events.length} cricket events`);

    if (events.length === 0) {
      // console.log("ℹ️ [Fancy Sync] No cricket events found");
      return;
    }

    const bulkOps = [];
    let totalFancy = 0;

    for (const ev of events) {
      try {
        console.log(`  🔍 Event ${ev.eventId}`);

        const { data } = await client.get(
          `/fancy-bookmaker-odds/${ev.eventId}`,
        );

        const rawFancy = data?.fancy || [];
        console.log(`    ✔️ Received ${rawFancy.length} fancy markets`);

        if (rawFancy.length === 0) continue;

        totalFancy += rawFancy.length;

        const fancy = rawFancy.map((f) => {
          const item = typeof f === "string" ? JSON.parse(f) : f;
          return {
            selectionId: String(item.SelectionId),
            runnerName: item.RunnerName,
            gtype: item.gtype,
            backPrice: item.BackPrice1,
            backSize: item.BackSize1,
            layPrice: item.LayPrice1,
            laySize: item.LaySize1,
            min: item.min,
            max: item.max,
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
            filter: { eventId: ev.eventId },
            update: {
              $set: {
                eventId: ev.eventId,
                bookmaker,
                fancy,
                lastSyncedAt: new Date(),
              },
            },
            upsert: true,
          },
        });

        console.log(`    📝 Mapped ${fancy.length} fancy items`);
      } catch (innerErr) {
        // console.error(
        //   `❌ [Fancy Sync] Event ${ev.eventId} failed:`,
        //   innerErr.message,
        // );
      }
    }

    console.log(`  📊 Total bulkOps: ${bulkOps.length}`);

    if (bulkOps.length > 0) {
      try {
        const result = await CricketFancyOdds.bulkWrite(bulkOps);
        // console.log(
        //   `  ✅ Fancy synced - Upserted: ${result.upsertedCount}, Modified: ${result.modifiedCount}`,
        // );
      } catch (bulkErr) {
        console.error("❌ BulkWrite failed:", bulkErr.message);
      }
    }

    // console.log(`✅ [Fancy Sync] Complete - ${totalFancy} total fancy markets`);
  } catch (err) {
    console.error(
      "❌ [Cricket Fancy/Bookmaker Sync] fatal error:",
      err.message,
    );
  }
};
