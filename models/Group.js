import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  createdBy: { type: String, required: true },
  members: { type: [String], default: [] },
  createdAt: { type: Number, default: Date.now }
});

export default mongoose.model("Group", groupSchema);
