import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    sportId: { type: String, required: true, index: true },
    competitionId: { type: String, index: true },
    name: { type: String, required: true },
    countryCode: { type: String, default: "" },
    timezone: { type: String, default: "" },
    openDate: { type: Date, required: true, index: true },
    marketCount: { type: Number, default: 0 },
    isPremiumActive: { type: Boolean, default: false },
    lastSyncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

eventSchema.index({ sportId: 1, openDate: 1 });

const Event = mongoose.model("Event", eventSchema);
export default Event;
