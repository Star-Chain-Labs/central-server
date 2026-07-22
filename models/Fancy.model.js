import mongoose from "mongoose";

const fancyBetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
      index: true,
    },
    eventId: { type: String, required: true, index: true }, // e.g. "35823403"
    selectionId: { type: String, required: true }, // e.g. "1" (SelectionId from provider)
    runnerName: { type: String, required: true }, // e.g. "1 to 25 Balls runs MIL(MIL vs SRL)adv"

    // "session" = line/number bet (over-under) | "fancy1"/"oddeven"/"khado"/"meter" = binary event bet
    gtype: {
      type: String,
      enum: ["session", "fancy1", "oddeven", "khado", "meter"],
      required: true,
    },

    side: { type: String, enum: ["YES", "NO"], required: true },
    price: { type: Number, required: true },
    stake: { type: Number, required: true, min: 1 },

    status: {
      type: String,
      enum: ["OPEN", "SETTLING", "WON", "LOST", "VOID"],
      default: "OPEN",
      index: true,
    },

    profit: { type: Number, default: 0 }, // computed at settlement
    liability: { type: Number, default: 0 }, // stake for YES, stake for session NO, etc.

    settledAt: { type: Date, default: null },
    settledResult: { type: mongoose.Schema.Types.Mixed, default: null }, // actual value or outcome used
  },
  { timestamps: true },
);

fancyBetSchema.index({ eventId: 1, selectionId: 1, status: 1 });

const FancyBet =
  mongoose.models.FancyBet || mongoose.model("FancyBet", fancyBetSchema);
export default FancyBet;
