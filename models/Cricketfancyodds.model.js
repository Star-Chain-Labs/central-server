import mongoose from "mongoose";

const bookmakerRunnerSchema = new mongoose.Schema(
  {
    sid: String,
    nat: String,
    b1: String,
    bs1: String,
    l1: String,
    ls1: String,
    min: String,
    max: String,
    status: String, // ACTIVE | SUSPENDED
  },
  { _id: false },
);

const fancyRunnerSchema = new mongoose.Schema(
  {
    selectionId: String,
    runnerName: String,
    gtype: String, // session | fancy1 | oddeven | khado | meter
    backPrice: Number,
    backSize: Number,
    layPrice: Number,
    laySize: Number,
    min: Number,
    max: Number,
    remark: { type: String, default: "" },
  },
  { _id: false },
);

const cricketFancyOddsSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    bookmaker: [bookmakerRunnerSchema],
    fancy: [fancyRunnerSchema],
    lastSyncedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

const CricketFancyOdds = mongoose.model(
  "CricketFancyOdds",
  cricketFancyOddsSchema,
);
export default CricketFancyOdds;
