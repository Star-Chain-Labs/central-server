import axios from "axios";
import Sport from "../models/Sport.model.js";
import Competition from "../models/Competition.model.js";

const PROVIDER_BASE = process.env.CLIENT_API_URL;
const client = axios.create({ baseURL: PROVIDER_BASE, timeout: 15000 });

export const syncCompetitions = async () => {
  try {
    const sports = await Sport.find({ isActive: true });

    for (const sport of sports) {
      try {
        const { data } = await client.get(`/competition-list/${sport.sportId}`);
        const competitions = data || [];

        const ops = competitions.map((c) => ({
          updateOne: {
            filter: { sportId: sport.sportId, competitionId: c.competition.id },
            update: {
              $set: {
                name: c.competition.name,
                region: c.competitionRegion || "",
                marketCount: c.marketCount || 0,
                lastSyncedAt: new Date(),
              },
            },
            upsert: true,
          },
        }));

        if (ops.length > 0) {
          await Competition.bulkWrite(ops);
        }

        console.log(
          `✅ [Competitions Sync] ${sport.name} (${sport.sportId}) — ${competitions.length} competitions`,
        );
      } catch (innerErr) {
        console.error(
          `❌ [Competitions Sync] ${sport.name} failed:`,
          innerErr.message,
        );
      }
    }
  } catch (err) {
    console.error("❌ [Competitions Sync] fatal error:", err.message);
  }
};
