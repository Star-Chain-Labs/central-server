import mongoose from "mongoose";

const matchSchema = new mongoose.Schema(
  {
    matchId: String,

    sportKey: String,

    homeTeam: String,

    awayTeam: String,

    commenceTime: Date,

    bookmakers: Array,

    status: {
      type: String,
      default: "UPCOMING",
    },

    result: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Match", matchSchema);
