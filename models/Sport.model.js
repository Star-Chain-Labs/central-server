import mongoose from "mongoose";

const sportSchema = new mongoose.Schema(
  {
    sportId: { type: String, required: true, unique: true, index: true }, // "4"
    name: { type: String, required: true },
    key: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Sport = mongoose.model("Sport", sportSchema);
export default Sport;
