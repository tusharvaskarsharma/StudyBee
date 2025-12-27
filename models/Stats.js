import mongoose from "mongoose";

const statsSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  learningTime: { type: Number, default: 0 },
  distractionTime: { type: Number, default: 0 },
  lastUpdated: { type: Number, default: Date.now }
});

export default mongoose.model("Stats", statsSchema);
