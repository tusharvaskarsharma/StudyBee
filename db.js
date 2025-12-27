import mongoose from "mongoose";

export async function connectDB() {
  try {
    const uri = process.env.MONGODB_URL;
    if (!uri) {
      throw new Error("❌ MONGODB_URI missing");
    }

    await mongoose.connect(uri, {
      dbName: "studybee"
    });

    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection failed", err.message);
    process.exit(1);
  }
}
