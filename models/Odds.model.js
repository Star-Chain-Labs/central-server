import mongoose from "mongoose";

const priceLevelSchema = new mongoose.Schema(
  { price: Number, size: Number },
  { _id: false },
);

const runnerOddsSchema = new mongoose.Schema(
  {
    selectionId: { type: Number, required: true },
    status: { type: String, default: "ACTIVE" }, // ACTIVE | SUSPENDED
    availableToBack: [priceLevelSchema],
    availableToLay: [priceLevelSchema],
  },
  { _id: false },
);

const oddsSchema = new mongoose.Schema(
  {
    marketId: { type: String, required: true, unique: true, index: true },
    eventId: { type: String, required: true, index: true },
    sportId: { type: String, required: true, index: true },
    status: { type: String, default: "OPEN" }, // OPEN | SUSPENDED | CLOSED
    inPlay: { type: Boolean, default: false },
    totalMatched: { type: Number, default: 0 },
    runners: [runnerOddsSchema],
    lastSyncedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

const Odds = mongoose.model("Odds", oddsSchema);
export default Odds;
