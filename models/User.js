import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  nickname: { type: String, required: true },
  createdAt: { type: Number, default: Date.now },
  groups: { type: [String], default: [] }
});

export default mongoose.model("User", userSchema);
