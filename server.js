// server.js – Enhanced with Competition Features

import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";
import fs from "fs";

const DATA_FILE = "./data.json";

let db = {
  users: {},
  groups: {},
  stats: {},
  weeklyWins: {}
};

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      db = JSON.parse(raw);
      console.log("✅ data.json loaded");
    }
  } catch (err) {
    console.error("❌ Failed to load data.json", err);
  }
}

function saveData() {
  try {
    const tempFile = DATA_FILE + ".tmp";
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2));
    fs.renameSync(tempFile, DATA_FILE);
  } catch (err) {
    console.error("❌ Failed to save data.json safely", err);
  }
}




// ==================== BASIC SETUP ====================
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "5mb" }));

// ==================== IN-MEMORY DATA STORE ====================
// NOW WE ARE USING JSON.DATA

// ==================== GEMINI CLIENT ====================
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY missing");
  process.exit(1);
}

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

loadData();

console.log("🚀 AI Study Coach Server running");
console.log("🤖 Gemini model: gemini-2.5-flash");

// ==================== HELPER FUNCTIONS ====================
function generateGroupCode() {
  let code;
  do {
    code = crypto.randomBytes(3).toString("hex").toUpperCase();
  } while (db.groups[code]);
  return code;
}


function generateUserId() {
  return crypto.randomBytes(16).toString('hex');
}

// ==================== USER ENDPOINTS ====================
app.post("/api/user/register", (req, res) => {
  const { nickname } = req.body;

  if (!nickname || nickname.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: "Nickname is required"
    });
  }

  if (nickname.length > 20) {
    return res.status(400).json({
      success: false,
      error: "Nickname must be 20 characters or less"
    });
  }
  // 🔴 DUPLICATE NICKNAME CHECK
const cleanName = nickname.trim();
if (Object.values(db.users).some(u => u.nickname === cleanName)) {
  return res.status(400).json({
    success: false,
    error: "Nickname already taken"
  });
}

  const userId = generateUserId();
  const user = {
    userId,
    nickname: cleanName,
    createdAt: Date.now()
  };

  db.users[userId] = user;
  db.stats[userId] = {
  learningTime: 0,
  distractionTime: 0,
  lastUpdated: Date.now()
  };

  saveData();


  console.log(`✅ New user registered: ${nickname} (${userId})`);

  res.json({
    success: true,
    user: {
      userId,
      nickname: user.nickname
    }
  });
});

// ==================== GROUP ENDPOINTS ====================
app.post("/api/group/create", (req, res) => {
  const { userId, groupName } = req.body;

  if (!db.users[userId]) {
    return res.status(404).json({
      success: false,
      error: "User not found"
    });
  }

  if (!groupName || groupName.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: "Group name is required"
    });
  }

  const groupCode = generateGroupCode();
  const group = {
    code: groupCode,
    name: groupName.trim(),
    createdBy: userId,
    members: [userId],
    createdAt: Date.now()
  };

  db.groups[groupCode] = group;
  saveData();


  console.log(`✅ New group created: ${groupName} (${groupCode}) by ${db.users[userId].nickname}`);


  res.json({
    success: true,
    group: {
      code: groupCode,
      name: group.name
    }
  });
});

app.post("/api/group/join", (req, res) => {
  const { userId, groupCode } = req.body;

  if (!db.users[userId]) {
    return res.status(404).json({
      success: false,
      error: "User not found"
    });
  }

  const code = groupCode.toUpperCase().trim();
  if (!db.groups[code]) {
    return res.status(404).json({
      success: false,
      error: "Group not found"
    });
  }

  const group = db.groups[code];

  if (group.members.includes(userId)) {
    return res.status(400).json({
      success: false,
      error: "Already a member of this group"
    });
  }
  group.members.push(userId);

  // 🔴 ADD USER → USER.GROUPS (IMPORTANT)
  db.users[userId].groups = db.users[userId].groups || [];

  if (!db.users[userId].groups.includes(code)) {
    db.users[userId].groups.push(code);
  }

saveData();

  console.log(`✅ User ${db.users[userId].nickname} joined group ${group.name} (${code})`);

  res.json({
    success: true,
    group: {
      code: group.code,
      name: group.name
    }
  });
});

app.get("/api/group/my-groups/:userId", (req, res) => {
  const { userId } = req.params;

  if (!db.users[userId]) {
    return res.status(404).json({
      success: false,
      error: "User not found"
    });
  }

  const userGroups = [];
  for (const code in db.groups) {
    const group = db.groups[code];
    if (group.members.includes(userId)) {
      userGroups.push({
        code: group.code,
        name: group.name,
        memberCount: group.members.length,
        isCreator: group.createdBy === userId
      });
    }
  }

  res.json({
    success: true,
    groups: userGroups
  });
});

app.post("/api/group/leave", (req, res) => {
  const { userId, groupCode } = req.body;

  if (!db.users[userId]) {
    return res.status(404).json({
      success: false,
      error: "User not found"
    });
  }

  const code = groupCode.toUpperCase().trim();
  if (!db.groups[code]) {
    return res.status(404).json({
      success: false,
      error: "Group not found"
    });
  }

  const group = db.groups[code];
  const memberIndex = group.members.indexOf(userId);

  if (memberIndex === -1) {
    return res.status(400).json({
      success: false,
      error: "Not a member of this group"
    });
  }

  group.members.splice(memberIndex, 1);
  // 🔴 REMOVE GROUP FROM USER.GROUPS (CRITICAL)
  db.users[userId].groups = (db.users[userId].groups || []).filter(g => g !== code);


  // Delete group if empty
  if (group.members.length === 0) {
    delete db.groups[code];
    console.log(`🗑️ Group ${group.name} (${code}) deleted (empty)`);
  } else {
    console.log(`✅ User ${db.users[userId].nickname} left group ${group.name} (${code})`);
  }
  saveData();

  res.json({
    success: true
  });
});

// ==================== LEADERBOARD ENDPOINT ====================
app.get("/api/leaderboard/:groupCode", (req, res) => {
  const { groupCode } = req.params;
  const code = groupCode.toUpperCase().trim();

  if (!db.groups[code]) {
    return res.status(404).json({
      success: false,
      error: "Group not found"
    });
  }

  const group = db.groups[code];
  const leaderboard = [];

  for (const memberId of group.members) {
    const user = db.users[memberId];
    const userStats = db.stats[memberId] || {
      learningTime: 0,
      distractionTime: 0
    };

    leaderboard.push({
      userId: memberId,
      nickname: user.nickname,
      learningTime: userStats.learningTime,
      distractionTime: userStats.distractionTime,
      focusScore: Math.max(0, userStats.learningTime - userStats.distractionTime * 0.5)
    });
  }

  // Sort by focus score descending
  leaderboard.sort((a, b) => b.focusScore - a.focusScore);

  // Add rank
  leaderboard.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  res.json({
    success: true,
    groupName: group.name,
    leaderboard
  });
});

// ==================== STATS SYNC ENDPOINT ====================
app.post("/api/stats/sync", (req, res) => {
  const { userId, learningTime, distractionTime } = req.body;

  if (!db.users[userId]) {
    return res.status(404).json({
      success: false,
      error: "User not found"
    });
  }

  const prevStats = db.stats[userId] || {
  learningTime: 0,
  distractionTime: 0
  };

  const mergedStats = {
    learningTime: Math.max(
      prevStats.learningTime,
      Math.floor(learningTime || 0)
    ),
  distractionTime: Math.max(
    prevStats.distractionTime,
    Math.floor(distractionTime || 0)
  ),
  lastUpdated: Date.now()
};

db.stats[userId] = mergedStats;

  saveData();

  res.json({
    success: true,
    stats: mergedStats
  });
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
app.get("/health", (req, res) => {
  res.json({
    success: true,
    model: "gemini-2.5-flash",
    users: Object.keys(db.users).length,
    groups: Object.keys(db.groups).length,
    time: new Date().toISOString()
  });
});


// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log("=".repeat(50));
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`✅ AI endpoint: http://localhost:${PORT}/ai`);
  console.log(`✅ Competition enabled`);
  console.log("=".repeat(50));

});

