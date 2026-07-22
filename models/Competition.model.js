import mongoose from "mongoose";

const competitionSchema = new mongoose.Schema(
  {
    competitionId: { type: String, required: true, unique: true, index: true },
    sportId: { type: String, required: true, index: true }, // "4"
    name: { type: String, required: true },
    region: { type: String, default: "" },
    marketCount: { type: Number, default: 0 },
    lastSyncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

competitionSchema.index({ sportId: 1, marketCount: -1 });

const Competition = mongoose.model("Competition", competitionSchema);
export default Competition;
