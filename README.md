#  StudyBee🐝 – AI‑Powered Student Productivity Tracker

StudyBee is a **Chrome Extension** that helps students **study smarter, stay focused, and compete productively** using AI.

It automatically tracks browsing activity, classifies it into *Learning* and *Distraction*, generates **AI‑based insights**, and transforms productivity into a **motivating competitive experience** through leaderboards.

---

## 🚩 Problem Statement

Students often:

* Lose track of how much time they actually study
* Get distracted without realizing it
* Lack motivation and accountability
* Don’t know **which hours they study best**

Existing tools track time — but **don’t guide behavior**.

---

## 💡 Solution – StudyBee

StudyBee combines:

* **Automatic productivity tracking**
* **AI‑powered feedback & reflections**
* **Gamified competition**

To help students **understand their habits and improve consistently**.

---

## ✨ Key Features

### 📊 Automatic Productivity Tracking

* Tracks active browser tabs in real time
* Classifies activity as **Learning / Distraction / Mixed**
* Maintains last **7 days** of activity data

### 🤖 AI‑Powered Study Coach

* Daily **AI motivation** based on activity
* **Study Coach Chat** for guidance

### ✨ Weekly AI Reflection

  * Analyzes weekly performance in a few sentences
  * Generates graph comparing learning vs distraction 
  * Identifies **best focus hours**
  * Suggests **ideal study timings**

### 🏆 Competition & Leaderboards

* **Create or join groups** using a unique code
* Compete with friends on **focus score**
* Live leaderboards inside the extension
* Tracks **Rank #1 streaks** 🥇
* Gamified experience by earning points 

### 🚨 Notification Alerts

* Sends notification when distracted time exceeds learning time
* Resends notofication every 30 minutes while (distraction > learning)

### 🎨 User Experience

* Clean, animated popup UI
* Daily progress cards
* Weekly charts (Chart.js)
* Smooth modal interactions

---

## 🧠 How It Works

1. The Chrome extension tracks active tabs
2. Websites are classified using:

   * Known learning & distraction domains
   * Title‑based keyword analysis
3. Activity data is stored locally
4. Data syncs with the backend
5. Backend:

   * Manages users & groups
   * Computes leaderboard scores
   * Uses **Gemini AI** for insights

---

## 🚀 Getting Started (User Setup)

The backend is **already hosted on Render** 🚀

### Steps

1. Open Chrome → `chrome://extensions`
2. Enable **Developer Mode**
3. Click **Load Unpacked**
4. Select the **StudyBee project folder**

That’s it 🎉
StudyBee will automatically:

* Connect to the hosted backend
* Start tracking productivity
* Enable AI insights & competition

No local server setup required.

---

## 🌐 Deployment Status

* Backend: **Live on Render** ✅
* Secure HTTPS & global availability
* Supports **multiple users on different devices** competing together


---

## 🎯 Future Scope

### 🌍 Domain‑Based & Global Leaderboards

* Domain‑wise global leaderboards:

  * Engineering
  * Medical
  * JEE / NEET
  * SSC
  * UPSC
* Students can view:

  * Their **domain‑specific global rank**
  * An **overall global leaderboard rank**

Ensures fair competition while maintaining global motivation.

### 🤖 AI Enhancements

* Deeper behavioral analysis
* Smarter study‑time recommendations
* **Personalized** long‑term improvement plans

### 💼 Business & Monetization Vision

* **Freemium model**:

  * Core tracking free
  * Premium AI insights & planning
* **Coaching & Institution Partnerships**
* **Sponsored challenges & leaderboards**
* **Privacy‑first aggregated analytics**

---

## 🛠️ Tech Stack

**Frontend (Chrome Extension)**

* HTML, CSS, JavaScript
* Chrome Extensions API (MV3)
* Chart.js

**Backend**

* Node.js
* Express.js
* Google Gemini API
* File‑based storage (data.json)

---

## 👤 Author

**Team BEGINNY**
[Akanksha, Tushar]

Built with hardwork and sleepy eyes TT to help students **study smarter, not harder**.

---

## 🏁 Final Note

StudyBee🐝 is not just a productivity tracker —
It is a **behavior‑driven, AI‑guided learning companion** designed to scale across millions of students.




