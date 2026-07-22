import mongoose from "mongoose";

const runnerSubSchema = new mongoose.Schema(
  {
    selectionId: { type: Number, required: true },
    runnerName: { type: String, required: true },
    handicap: { type: Number, default: 0 },
    sortPriority: { type: Number, default: 0 },
  },
  { _id: false },
);

const marketSchema = new mongoose.Schema(
  {
    marketId: { type: String, required: true, unique: true, index: true },
    eventId: { type: String, required: true, index: true },
    sportId: { type: String, required: true, index: true },
    marketName: { type: String, required: true }, // "Match Odds", "Bookmaker", etc
    runners: [runnerSubSchema],
    totalMatched: { type: Number, default: 0 },
    marketStartTime: { type: Date },
    lastSyncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const Market = mongoose.model("Market", marketSchema);
export default Market;
