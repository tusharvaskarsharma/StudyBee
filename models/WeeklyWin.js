import mongoose from "mongoose";

const weeklyWinSchema = new mongoose.Schema({
  userId: String,
  week: String,
  score: Number
});

export default mongoose.model("WeeklyWin", weeklyWinSchema);
