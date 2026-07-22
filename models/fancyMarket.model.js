import mongoose from "mongoose";

const fancyMarketSchema = new mongoose.Schema(
  {
    matchId: { type: String, required: true, index: true },
    sport: { type: String, default: "cricket" },

    homeTeam: String,
    awayTeam: String,

    question: { type: String, required: true },

    category: {
      type: String,
      enum: [
        "player_runs",
        "session_runs",
        "over_runs",
        "wicket",
        "boundaries",
        "other",
      ],
      default: "other",
      index: true,
    },

    // MAIN LINE (single source of truth)
    line: { type: Number, required: true },

    yesOdds: { type: Number, default: 1.9 },
    noOdds: { type: Number, default: 1.9 },

    minBet: { type: Number, default: 100 },
    maxBet: { type: Number, default: 50000 },

    totalYesStake: { type: Number, default: 0 },
    totalNoStake: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["OPEN", "SUSPENDED", "SETTLED", "CANCELLED"],
      default: "OPEN",
      index: true,
    },

    actualResult: { type: Number, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "UserModel" },
    settledBy: { type: mongoose.Schema.Types.ObjectId, ref: "UserModel" },

    settledAt: Date,
    settlementNote: String,
  },
  { timestamps: true, versionKey: false },
);

// INDEXES
fancyMarketSchema.index({ matchId: 1, status: 1 });
fancyMarketSchema.index({ createdAt: -1 });

const FancyMarket = mongoose.model("FancyMarket", fancyMarketSchema);
export default FancyMarket;
