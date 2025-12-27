// server.js – Enhanced with Competition Features

import "dotenv/config";
import express from "express";
import cors from "cors";

import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";
import { connectDB } from "./db.js";

import User from "./models/User.js";
import Group from "./models/Group.js";
import Stats from "./models/Stats.js";
//import WeeklyWin from "./models/WeeklyWin.js";


// ==================== BASIC SETUP ====================
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "5mb" }));

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log("=".repeat(50));
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ AI endpoint: /ai`);
      console.log(`✅ Competition enabled`);
      console.log("=".repeat(50));
    });

  } catch (err) {
    console.error("❌ Server failed to start", err);
    process.exit(1);
  }
}

startServer();

// ==================== IN-MEMORY DATA STORE ====================
// WE ARE USING MONGODB

// ==================== GEMINI CLIENT ====================
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY missing");
  process.exit(1);
}

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});


console.log("🚀 AI Study Coach Server running");
console.log("🤖 Gemini model: gemini-2.5-flash");

// ==================== HELPER FUNCTIONS ====================
async function generateGroupCode() {
  let code;
  do {
    code = crypto.randomBytes(3).toString("hex").toUpperCase();
  } while (await Group.findOne({ code }));
  return code;
}


// ==================== USER ENDPOINTS ====================
app.post("/api/user/register", async (req, res) => {
  try {
    const { nickname } = req.body;
    if (!nickname) {
      return res.status(400).json({ error: "Nickname required" });
    }

    const cleanName = nickname.trim();

    const existing = await User.findOne({ nickname: cleanName });
    if (existing) {
      return res.status(400).json({ error: "Nickname already taken" });
    }

    const userId = crypto.randomBytes(16).toString("hex");

    const user = await User.create({
      userId,
      nickname: cleanName
    });

    await Stats.create({ userId });

    res.json({
      success: true,
      user: {
        userId,
        nickname: user.nickname
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});


// ==================== GROUP ENDPOINTS ====================
app.post("/api/group/create", async (req, res) => {
  try {
    const { userId, groupName } = req.body;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!groupName || !groupName.trim()) {
      return res.status(400).json({ error: "Group name required" });
    }

    const groupCode = await generateGroupCode();

    const group = await Group.create({
      code: groupCode,
      name: groupName.trim(),
      createdBy: userId,
      members: [userId]
    });

    // user ke groups me add
    user.groups.push(groupCode);
    await user.save();

    res.json({
      success: true,
      group: {
        code: group.code,
        name: group.name
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Group creation failed" });
  }
});


app.post("/api/group/join", async (req, res) => {
  try {
    const { userId, groupCode } = req.body;

    if (!userId || !groupCode) {
      return res.status(400).json({ error: "userId and groupCode required" });
    }

    const code = groupCode.toUpperCase().trim();

    // 1️⃣ user check
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 2️⃣ group check
    const group = await Group.findOne({ code });
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // 3️⃣ already member?
    if (group.members.includes(userId)) {
      return res.status(400).json({ error: "Already a member of this group" });
    }

    // 4️⃣ add user to group
    group.members.push(userId);
    await group.save();

    // 5️⃣ add group to user
    if (!user.groups.includes(code)) {
      user.groups.push(code);
      await user.save();
    }

    res.json({
      success: true,
      group: {
        code: group.code,
        name: group.name
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Join group failed" });
  }
});


app.get("/api/group/my-groups/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // 1️⃣ user check
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 2️⃣ fetch groups user belongs to
    const groups = await Group.find({
      members: userId
    });

    const result = groups.map(group => ({
      code: group.code,
      name: group.name,
      memberCount: group.members.length,
      isCreator: group.createdBy === userId
    }));

    res.json({
      success: true,
      groups: result
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
});


app.post("/api/group/leave", async (req, res) => {
  try {
    const { userId, groupCode } = req.body;

    if (!userId || !groupCode) {
      return res.status(400).json({ error: "userId and groupCode required" });
    }
    const code = groupCode.toUpperCase().trim();
    // 1️⃣ find user
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    // 2️⃣ find group
    const group = await Group.findOne({ code });
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }
    // 3️⃣ check membership
    if (!group.members.includes(userId)) {
      return res.status(400).json({ error: "Not a member of this group" });
    }
    // 4️⃣ remove user from group
    group.members = group.members.filter(id => id !== userId);
    // 5️⃣ remove group from user
    user.groups = user.groups.filter(g => g !== code);
    // 6️⃣ if group empty → delete
    if (group.members.length === 0) {
      await Group.deleteOne({ code });
      console.log(`🗑️ Group ${code} deleted (empty)`);
    } else {
      await group.save();
    }

    await user.save();

    res.json({
      success: true,
      message: "Left group successfully"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Leave group failed" });
  }
});


// ==================== LEADERBOARD ENDPOINT ====================
app.get("/api/leaderboard/:groupCode", async (req, res) => {
  try {
    const code = req.params.groupCode.toUpperCase().trim();

    // 1️⃣ find group
    const group = await Group.findOne({ code });
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    const leaderboard = [];

    // 2️⃣ loop members
    for (const userId of group.members) {
      const user = await User.findOne({ userId });
      if (!user) continue;

      const stats = await Stats.findOne({ userId });

      const learningTime = stats?.learningTime || 0;
      const distractionTime = stats?.distractionTime || 0;

      const focusScore = Math.max(
        0,
        learningTime - distractionTime * 0.5
      );

      leaderboard.push({
        userId,
        nickname: user.nickname,
        learningTime,
        distractionTime,
        focusScore
      });
    }

    // 3️⃣ sort by focus score
    leaderboard.sort((a, b) => b.focusScore - a.focusScore);

    // 4️⃣ add rank
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    res.json({
      success: true,
      groupName: group.name,
      leaderboard
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Leaderboard fetch failed" });
  }
});


// ==================== STATS SYNC ENDPOINT ====================
app.post("/api/stats/sync", async (req, res) => {
  try {
    const { userId, learningTime, distractionTime } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    // 1️⃣ user exists?
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 2️⃣ get existing stats (or create if missing)
    let stats = await Stats.findOne({ userId });
    if (!stats) {
      stats = await Stats.create({ userId });
    }

    // 3️⃣ merge safely (never decrease)
    const newLearning = Math.max(
      stats.learningTime || 0,
      Math.floor(learningTime || 0)
    );

    const newDistraction = Math.max(
      stats.distractionTime || 0,
      Math.floor(distractionTime || 0)
    );

    stats.learningTime = newLearning;
    stats.distractionTime = newDistraction;
    stats.lastUpdated = Date.now();

    await stats.save();

    res.json({
      success: true,
      stats: {
        learningTime: stats.learningTime,
        distractionTime: stats.distractionTime,
        lastUpdated: stats.lastUpdated
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Stats sync failed" });
  }
});


// ==================== AI PROMPT BUILDER ====================
function buildPrompt(type, data) {
  if (type === "chat") {
    return `
You are a friendly AI study coach.

Student data:
Learning time: ${data.learningTime}
Distraction time: ${data.distractionTime}
Best study hours: ${data.bestHours}
Recent pattern: ${data.pattern}

Student question:
"${data.question}"

Rules:
- Be supportive and concise
- Give practical advice
- Do NOT mention AI, Gemini, or models
`;
  }

  if (type === "reflection") {
    return `
You are an academic mentor.

Weekly summary:
Learning time: ${data.learningTime}
Distraction time: ${data.distractionTime}
Mixed time: ${data.mixedTime}
Best study hours: ${data.bestHours}
Trend: ${data.trend}

Write a 1-2 sentence weekly reflection.
End with one gentle suggestion.
Do NOT mention AI or models.
`;
  }

  if (type === "motivation") {
    return `
Generate ONE short motivational message for a student.

Event: ${data.event}
Details: ${data.details}

Rules:
- One sentence only
- Friendly and encouraging
- No emojis
- Do NOT mention AI or models
`;
  }

  return null;
}

// ==================== AI ENDPOINT ====================
app.post("/ai", async (req, res) => {
  const { type, data } = req.body;

  if (!type || !data) {
    return res.status(400).json({
      success: false,
      error: "Invalid request format"
    });
  }

  const prompt = buildPrompt(type, data);
  if (!prompt) {
    return res.status(400).json({
      success: false,
      error: "Invalid AI request type"
    });
  }

  try {
    const result = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ]
    });

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    res.json({
      success: true,
      message: text?.trim()
    });

  } catch (err) {
    console.error("❌ Gemini error:", err.message);
    res.status(500).json({
      success: false,
      message: "AI temporarily unavailable"
    });
  }
});

// ==================== HEALTH CHECK ====================
app.get("/health", async (req, res) => {
  res.json({
    success: true,
    model: "gemini-2.5-flash",
    users: await User.countDocuments(),
    groups: await Group.countDocuments(),
    time: new Date().toISOString()
  });
});
