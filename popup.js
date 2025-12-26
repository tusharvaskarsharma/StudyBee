// Popup script with Competition Features - INDIAN TIME + RANK HISTORY
const BASE_URL = "https://studybee-3ru4.onrender.com";

const API_URL = `${BASE_URL}/ai`;
const SERVER_URL = `${BASE_URL}/api`;


// Helper function to get Indian date string
function getIndianDateString() {
  const now = new Date();
  const indianTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return indianTime.toLocaleDateString('en-CA'); // YYYY-MM-DD format
}

function refreshLeaderboardIfVisible() {
  const leaderboardTab = document.getElementById('leaderboardTab');
  const selectedGroup = groupSelect.value;

  if (
    leaderboardTab &&
    leaderboardTab.classList.contains('active') &&
    selectedGroup
  ) {
    loadLeaderboard(selectedGroup);
  }
}


// DOM Elements
const learningTimeEl = document.getElementById('learningTime');
const distractionTimeEl = document.getElementById('distractionTime');
const mixedTimeEl = document.getElementById('mixedTime');
const weeklyInsightEl = document.getElementById('weeklyInsight');
const currentActivityEl = document.getElementById('currentActivity');
const dailyMotivationEl = document.getElementById('dailyMotivation');

const chatBtn = document.getElementById('chatBtn');
const reflectionBtn = document.getElementById('reflectionBtn');
const competitionBtn = document.getElementById('competitionBtn');

const chatModal = document.getElementById('chatModal');
const reflectionModal = document.getElementById('reflectionModal');
const competitionModal = document.getElementById('competitionModal');
const welcomeModal = document.getElementById('welcomeModal');

const closeChatBtn = document.getElementById('closeChatBtn');
const closeReflectionBtn = document.getElementById('closeReflectionBtn');
const closeCompetitionBtn = document.getElementById('closeCompetitionBtn');

const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');

const reflectionContent = document.getElementById('reflectionContent');
const weeklyChartContainer = document.getElementById('weeklyChartContainer');

// Competition elements
const tabBtns = document.querySelectorAll('.tab-btn');
const groupSelect = document.getElementById('groupSelect');
const leaderboardContent = document.getElementById('leaderboardContent');
const myGroupsList = document.getElementById('myGroupsList');
const createGroupBtn = document.getElementById('createGroupBtn');
const joinGroupBtn = document.getElementById('joinGroupBtn');
const createGroupName = document.getElementById('createGroupName');
const joinGroupCode = document.getElementById('joinGroupCode');
const nicknameInput = document.getElementById('nicknameInput');
const saveNicknameBtn = document.getElementById('saveNicknameBtn');

let weeklyChart = null;
let currentUser = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await checkUserRegistration();
  await loadTodayStats();
  await loadWeeklyInsight();
  await loadDailyMotivation();
  await updateCurrentActivity();
  await checkDistractionAlert();
  setupEventListeners();
  
  // Sync stats periodically
  setInterval(syncStatsToServer, 60000); // Every minute
  setInterval(loadTodayStats, 10000); // Refresh stats every 10 seconds
});

// ==================== USER MANAGEMENT ====================

async function checkUserRegistration() {
  try {
    const result = await chrome.storage.local.get(['user']);
    
    if (!result.user || !result.user.userId) {
      welcomeModal.style.display = 'flex';
    } else {
      currentUser = result.user;
    }
  } catch (error) {
    console.error('Error checking registration:', error);
  }
}

async function registerUser(nickname) {
  try {
    const response = await fetch(`${SERVER_URL}/user/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const data = await response.json();
    currentUser = data.user;
    
    // Initialize rank history
    const existing = await chrome.storage.local.get(['rankHistory']);

    await chrome.storage.local.set({
      user: currentUser,
      rankHistory: existing.rankHistory || {}
    });

    welcomeModal.style.display = 'none';    
    return true;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

async function syncStatsToServer() {
  if (!currentUser) return;

  try {
    const result = await chrome.storage.local.get(['data']);
    const data = result.data || { dailyStats: {} };
    const today = getIndianDateString();
    const todayStats = data.dailyStats[today] || { learning: 0, distraction: 0 };

    await fetch(`${SERVER_URL}/stats/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.userId,
        learningTime: todayStats.learning,
        distractionTime: todayStats.distraction
      })
    });
    refreshLeaderboardIfVisible();
    
  } catch (error) {
    console.error('Stats sync error:', error);
  }
}

// ==================== GROUP MANAGEMENT ====================

async function loadUserGroups() {
  if (!currentUser) return;

  try {
    const response = await fetch(`${SERVER_URL}/group/my-groups/${currentUser.userId}`);
    
    if (!response.ok) throw new Error('Failed to load groups');

    const data = await response.json();
    const groups = data.groups || [];

    groupSelect.innerHTML = '<option value="">Select a group...</option>';
    groups.forEach(group => {
      const option = document.createElement('option');
      option.value = group.code;
      option.textContent = `${group.name} (${group.memberCount} members)`;
      groupSelect.appendChild(option);
    });

    if (groups.length === 0) {
      myGroupsList.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">👥</span>
          <p>You haven't joined any groups yet</p>
        </div>
      `;
    } else {
      myGroupsList.innerHTML = groups.map(group => `
        <div class="group-card">
          <div class="group-info">
            <h4>${group.name}</h4>
            <p>${group.memberCount} members • Code: ${group.code}</p>
            ${group.isCreator ? '<span class="badge">Creator</span>' : ''}
          </div>
          <button class="action-btn danger small leave-group-btn" data-code="${group.code}">
            Leave
          </button>
        </div>
      `).join('');

      document.querySelectorAll('.leave-group-btn').forEach(btn => {
        btn.addEventListener('click', () => leaveGroup(btn.dataset.code));
      });
    }

  } catch (error) {
    console.error('Error loading groups:', error);
  }
}

async function loadLeaderboard(groupCode) {
  if (!groupCode) {
    leaderboardContent.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🏆</span>
        <p>Select a group to see the leaderboard</p>
      </div>
    `;
    return;
  }

  try {
    leaderboardContent.innerHTML = '<div class="loading">Loading leaderboard...</div>';

    const response = await fetch(`${SERVER_URL}/leaderboard/${groupCode}`);
    
    if (!response.ok) throw new Error('Failed to load leaderboard');

    const data = await response.json();
    const { groupName, leaderboard } = data;

    if (leaderboard.length === 0) {
      leaderboardContent.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📊</span>
          <p>No data yet. Start studying!</p>
        </div>
      `;
      return;
    }

    // Update rank history for rank 1
    if (leaderboard.length > 0 && leaderboard[0].userId === currentUser.userId) {
      await updateRankHistory(groupCode);
    }

    // Get rank history
    const rankHistory = await getRankHistory(groupCode);

    leaderboardContent.innerHTML = `
      <div class="leaderboard-header">
        <h4>${groupName}</h4>
        <div class="rank-history-badge">
          🏆 Rank #1 Days: <strong>${rankHistory}</strong>
        </div>
      </div>
      <div class="leaderboard-list">
        ${leaderboard.map(entry => {
          const isCurrentUser = entry.userId === currentUser.userId;
          return `
            <div class="leaderboard-entry ${isCurrentUser ? 'current-user' : ''} ${entry.rank <= 3 ? 'top-' + entry.rank : ''}">
              <div class="rank">
                ${entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
              </div>
              <div class="user-info">
                <div class="nickname">${entry.nickname} ${isCurrentUser ? '(You)' : ''}</div>
                <div class="stats-mini">
                  📚 ${formatTime(entry.learningTime)} • 🎮 ${formatTime(entry.distractionTime)}
                </div>
              </div>
              <div class="score">
                ${Math.floor(entry.focusScore / 60)}pts
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

  } catch (error) {
    console.error('Error loading leaderboard:', error);
    leaderboardContent.innerHTML = `
      <div class="error-message">
        Failed to load leaderboard. Please try again.
      </div>
    `;
  }
}

// Update rank history when user is rank 1
async function updateRankHistory(groupCode) {
  try {
    const result = await chrome.storage.local.get(['rankHistory']);
    const rankHistory = result.rankHistory || {};
    
    if (!rankHistory[groupCode]) {
      rankHistory[groupCode] = [];
    }
    
    const today = getIndianDateString();
    
    // Add today if not already in the list
    if (!rankHistory[groupCode].includes(today)) {
      rankHistory[groupCode].push(today);
      await chrome.storage.local.set({ rankHistory });
    }
  } catch (error) {
    console.error('Error updating rank history:', error);
  }
}

// Get total days at rank 1
async function getRankHistory(groupCode) {
  try {
    const result = await chrome.storage.local.get(['rankHistory']);
    const rankHistory = result.rankHistory || {};
    return rankHistory[groupCode] ? rankHistory[groupCode].length : 0;
  } catch (error) {
    console.error('Error getting rank history:', error);
    return 0;
  }
}

async function createGroup() {
  const groupName = createGroupName.value.trim();

  if (!groupName) {
    alert('Please enter a group name');
    return;
  }

  if (!currentUser) {
    alert('Please set up your nickname first');
    return;
  }

  try {
    createGroupBtn.disabled = true;
    createGroupBtn.textContent = 'Creating...';

    const response = await fetch(`${SERVER_URL}/group/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.userId,
        groupName
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create group');
    }

    const data = await response.json();
    
    alert(`Group created! Share this code: ${data.group.code}`);
    createGroupName.value = '';
    
    await loadUserGroups();
    switchTab('groups');

  } catch (error) {
    console.error('Create group error:', error);
    alert(error.message);
  } finally {
    createGroupBtn.disabled = false;
    createGroupBtn.textContent = 'Create';
  }
}

async function joinGroup() {
  const groupCode = joinGroupCode.value.trim().toUpperCase();

  if (!groupCode) {
    alert('Please enter a group code');
    return;
  }

  if (!currentUser) {
    alert('Please set up your nickname first');
    return;
  }

  try {
    joinGroupBtn.disabled = true;
    joinGroupBtn.textContent = 'Joining...';

    const response = await fetch(`${SERVER_URL}/group/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.userId,
        groupCode
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to join group');
    }

    const data = await response.json();
    
    alert(`Successfully joined ${data.group.name}!`);
    joinGroupCode.value = '';
    
    await loadUserGroups();
    switchTab('groups');

  } catch (error) {
    console.error('Join group error:', error);
    alert(error.message);
  } finally {
    joinGroupBtn.disabled = false;
    joinGroupBtn.textContent = 'Join';
  }
}

async function leaveGroup(groupCode) {
  if (!confirm('Are you sure you want to leave this group?')) return;

  try {
    const response = await fetch(`${SERVER_URL}/group/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.userId,
        groupCode
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to leave group');
    }

    alert('Successfully left the group');
    await loadUserGroups();

  } catch (error) {
    console.error('Leave group error:', error);
    alert(error.message);
  }
}

function switchTab(tabName) {
  tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  const actualTabName = tabName === 'join' ? 'joinCreate' : tabName;
  const tabElement = document.getElementById(`${actualTabName}Tab`);
  if (tabElement) {
    tabElement.classList.add('active');
  }

  if (actualTabName === 'leaderboard') {
    const selectedGroup = groupSelect.value;
    if (selectedGroup) loadLeaderboard(selectedGroup);
  } else if (actualTabName === 'groups') {
    loadUserGroups();
  }
}

// ==================== STATS & TRACKING ====================

async function loadDailyMotivation() {
  try {
    const today = getIndianDateString();
    const result = await chrome.storage.local.get(['dailyMotivation', 'motivationDate']);
    
    if (result.motivationDate === today && result.dailyMotivation) {
      dailyMotivationEl.textContent = result.dailyMotivation;
      return;
    }

    dailyMotivationEl.textContent = 'Loading motivation...';
    
    const statsResult = await chrome.storage.local.get(['data']);
    const data = statsResult.data || { dailyStats: {} };
    const todayStats = data.dailyStats[today] || { learning: 0, distraction: 0 };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'motivation',
        data: {
          event: 'daily',
          details: `Learning: ${formatTime(todayStats.learning)}, Distraction: ${formatTime(todayStats.distraction)}`
        }
      })
    });

    if (!response.ok) throw new Error('AI service unavailable');

    const aiResponse = await response.json();
    const motivation = aiResponse.message || 'Every small step counts toward your goals! 🌟';
    
    await chrome.storage.local.set({
      dailyMotivation: motivation,
      motivationDate: today
    });
    
    dailyMotivationEl.textContent = motivation;

  } catch (error) {
    console.error('Error loading motivation:', error);
    dailyMotivationEl.textContent = 'Focus on progress, not perfection! 🚀';
  }
}

async function loadTodayStats() {
  try {
    const result = await chrome.storage.local.get(['data']);
    const data = result.data || { dailyStats: {} };
    
    const today = getIndianDateString();
    const todayStats = data.dailyStats[today] || {
      learning: 0,
      distraction: 0,
      mixed: 0
    };

    learningTimeEl.textContent = formatTime(todayStats.learning);
    distractionTimeEl.textContent = formatTime(todayStats.distraction);
    mixedTimeEl.textContent = formatTime(todayStats.mixed);

  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

async function checkDistractionAlert() {
  try {
    const result = await chrome.storage.local.get(['data', 'lastAlertTime']);
    const data = result.data || { dailyStats: {} };
    const lastAlertTime = result.lastAlertTime || 0;
    
    const today = getIndianDateString();
    const todayStats = data.dailyStats[today] || {
      learning: 0,
      distraction: 0,
      mixed: 0
    };

    if (todayStats.distraction > todayStats.learning && todayStats.distraction > 60) {
      const now = Date.now();
      const thirtyMinutes = 30 * 60 * 1000;
      
      if (now - lastAlertTime > thirtyMinutes) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon128.png',
          title: '⚠️ Focus Alert!',
          message: `Your distraction time (${formatTime(todayStats.distraction)}) exceeds learning time (${formatTime(todayStats.learning)}). Time to refocus! 💪`,
          priority: 2
        });

        await chrome.storage.local.set({ lastAlertTime: now });
      }
    }

  } catch (error) {
    console.error('Error checking distraction alert:', error);
  }
}

async function loadWeeklyInsight() {
  try {
    const result = await chrome.storage.local.get(['data']);
    const data = result.data || { dailyStats: {} };
    
    const bestHours = calculateBestStudyHours(data.dailyStats);
    
    if (bestHours) {
      weeklyInsightEl.textContent = `Your best study hours: ${bestHours}`;
    } else {
      weeklyInsightEl.textContent = 'Keep tracking to discover your peak study hours!';
    }

  } catch (error) {
    console.error('Error loading insight:', error);
    weeklyInsightEl.textContent = 'Start tracking to get insights';
  }
}

async function updateCurrentActivity() {
  try {
    chrome.runtime.sendMessage(
      { action: 'getCurrentActivity' },
      (response) => {
        if (response && response.category) {
          const statusDot = currentActivityEl.querySelector('.status-dot');
          const statusText = currentActivityEl.querySelector('.status-text');
          
          statusDot.className = `status-dot ${response.category}`;
          
          const categoryLabels = {
            learning: '🟢 Learning',
            distraction: '🔴 Distracted',
            mixed: '🟡 Mixed Activity'
          };
          
          statusText.textContent = categoryLabels[response.category] || 'Idle';
        }
      }
    );
  } catch (error) {
    console.error('Error updating activity:', error);
  }
}

function calculateBestStudyHours(dailyStats) {
  const hourlyLearning = {};
  
  Object.values(dailyStats).forEach(day => {
    if (day.hourly) {
      Object.entries(day.hourly).forEach(([hour, times]) => {
        if (!hourlyLearning[hour]) {
          hourlyLearning[hour] = 0;
        }
        hourlyLearning[hour] += times.learning || 0;
      });
    }
  });

  if (Object.keys(hourlyLearning).length === 0) {
    return null;
  }

  const bestHour = Object.entries(hourlyLearning)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 1)[0];

  if (!bestHour || bestHour[1] < 300) {
    return null;
  }

  const hour = parseInt(bestHour[0]);
  const endHour = hour + 1;
  
  return `${formatHour(hour)}-${formatHour(endHour)}`;
}

function formatHour(hour) {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour > 12) return `${hour - 12} PM`;
  return `${hour} AM`;
}

function formatTime(seconds) {
  if (seconds < 60) {
    return '< 1m';
  }
  
  const minutes = Math.floor(seconds / 60);
  
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

// ==================== CHAT & AI ====================
// (Rest of the functions remain unchanged - they already work with dates properly)

async function sendChatMessage() {
  const question = chatInput.value.trim();
  if (!question) return;
  addChatMessage(question, 'user');
  chatInput.value = '';
  chatInput.disabled = true;
  sendChatBtn.disabled = true;
  try {
    const analytics = await getAnalyticsForAI();
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'chat',
        data: {
          question: question,
          learningTime: formatTime(analytics.learningToday * 60),
          distractionTime: formatTime(analytics.distractionToday * 60),
          bestHours: analytics.bestHours,
          pattern: analytics.weeklyTrend
        }
      })
    });
    if (!response.ok) throw new Error('AI service unavailable');
    const data = await response.json();
    addChatMessage(data.message, 'assistant');
  } catch (error) {
    console.error('Chat error:', error);
    addChatMessage('Sorry, I\'m temporarily unavailable. Your tracking is still working though! 😊', 'assistant');
  } finally {
    chatInput.disabled = false;
    sendChatBtn.disabled = false;
    chatInput.focus();
  }
}

function addChatMessage(text, sender) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${sender}`;
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.textContent = text;
  messageDiv.appendChild(bubble);
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Continue with remaining functions exactly as before...
function setupEventListeners() {
  chatBtn.addEventListener('click', () => {
    chatModal.style.display = 'flex';
    chatInput.focus();
  });
  reflectionBtn.addEventListener('click', async () => {
    reflectionModal.style.display = 'flex';
    await generateReflection();
  });
  competitionBtn.addEventListener('click', async () => {
    if (!currentUser) {
      welcomeModal.style.display = 'flex';
      return;
    }
    competitionModal.style.display = 'flex';
    await loadUserGroups();
    switchTab('leaderboard');
  });
  closeChatBtn.addEventListener('click', () => { chatModal.style.display = 'none'; });
  closeReflectionBtn.addEventListener('click', () => { reflectionModal.style.display = 'none'; });
  closeCompetitionBtn.addEventListener('click', () => { competitionModal.style.display = 'none'; });
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => { switchTab(btn.dataset.tab); });
  });
  groupSelect.addEventListener('change', (e) => { loadLeaderboard(e.target.value); });
  createGroupBtn.addEventListener('click', createGroup);
  joinGroupBtn.addEventListener('click', joinGroup);
  createGroupName.addEventListener('keypress', (e) => { if (e.key === 'Enter') createGroup(); });
  joinGroupCode.addEventListener('keypress', (e) => { if (e.key === 'Enter') joinGroup(); });
  saveNicknameBtn.addEventListener('click', async () => {
    const nickname = nicknameInput.value.trim();
    if (!nickname) { alert('Please enter a nickname'); return; }
    if (nickname.length > 20) { alert('Nickname must be 20 characters or less'); return; }
    try {
      saveNicknameBtn.disabled = true;
      saveNicknameBtn.textContent = 'Saving...';
      await registerUser(nickname);
      welcomeModal.style.display = 'none';
      alert('Welcome! You can now join the competition.');
    } catch (error) {
      alert(error.message);
    } finally {
      saveNicknameBtn.disabled = false;
      saveNicknameBtn.textContent = 'Get Started';
    }
  });
  nicknameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') saveNicknameBtn.click(); });
  window.addEventListener('click', (e) => {
    if (e.target === chatModal) chatModal.style.display = 'none';
    if (e.target === reflectionModal) reflectionModal.style.display = 'none';
    if (e.target === competitionModal) competitionModal.style.display = 'none';
  });
  sendChatBtn.addEventListener('click', sendChatMessage);
  chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMessage(); });
}

async function getAnalyticsForAI() {
  const result = await chrome.storage.local.get(['data']);
  const data = result.data || { dailyStats: {} };
  const today = getIndianDateString();
  const todayStats = data.dailyStats[today] || { learning: 0, distraction: 0, mixed: 0 };
  const weekData = getWeeklyData(data);
  return {
    learningToday: Math.floor(todayStats.learning / 60),
    distractionToday: Math.floor(todayStats.distraction / 60),
    bestHours: weekData.bestHours || 'Not enough data yet',
    weeklyTrend: weekData.trend
  };
}

async function generateReflection() {
  reflectionContent.innerHTML = '<div class="loading">✨ Generating your reflection...</div>';
  weeklyChartContainer.style.display = 'none';
  try {
    const result = await chrome.storage.local.get(['data']);
    const data = result.data || { dailyStats: {}, sessions: [] };
    const weekData = getWeeklyData(data);
    weeklyChartContainer.style.display = 'block';
    createWeeklyChart(weekData);
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'reflection',
        data: {
          learningTime: formatTime(weekData.totalLearning),
          distractionTime: formatTime(weekData.totalDistraction),
          mixedTime: formatTime(weekData.totalMixed),
          bestHours: weekData.bestHours || 'Not identified yet',
          trend: weekData.trend
        }
      })
    });
    if (!response.ok) throw new Error('AI service unavailable');
    const aiResponse = await response.json();
    reflectionContent.innerHTML = `
      <div class="reflection-text">${aiResponse.message}</div>
      <div class="reflection-stats">
        <div class="reflection-stat">
          <span class="stat-label">Learning:</span>
          <span class="stat-value">${formatTime(weekData.totalLearning)}</span>
        </div>
        <div class="reflection-stat">
          <span class="stat-label">Distractions:</span>
          <span class="stat-value">${formatTime(weekData.totalDistraction)}</span>
        </div>
        <div class="reflection-stat">
          <span class="stat-label">Best Hours:</span>
          <span class="stat-value">${weekData.bestHours || 'Keep tracking!'}</span>
        </div>
      </div>`;
  } catch (error) {
    console.error('Reflection error:', error);
    const result = await chrome.storage.local.get(['data']);
    const data = result.data || { dailyStats: {}, sessions: [] };
    const weekData = getWeeklyData(data);
    weeklyChartContainer.style.display = 'block';
    createWeeklyChart(weekData);
    reflectionContent.innerHTML = `
      <div class="error-message">
        AI reflection is temporarily unavailable, but here's your week at a glance!
      </div>
      <div class="reflection-stats">
        <div class="reflection-stat">
          <span class="stat-label">Learning:</span>
          <span class="stat-value">${formatTime(weekData.totalLearning)}</span>
        </div>
        <div class="reflection-stat">
          <span class="stat-label">Distractions:</span>
          <span class="stat-value">${formatTime(weekData.totalDistraction)}</span>
        </div>
        <div class="reflection-stat">
          <span class="stat-label">Best Hours:</span>
          <span class="stat-value">${weekData.bestHours || 'Keep tracking!'}</span>
        </div>
      </div>`;
  }
}

function getWeeklyData(data) {
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  let totalLearning = 0, totalDistraction = 0, totalMixed = 0;
  const weekDates = [], dailyData = {};
  for (let d = new Date(sevenDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = new Date(d).toLocaleDateString('en-CA');
    weekDates.push(dateStr);
    dailyData[dateStr] = data.dailyStats[dateStr] || { learning: 0, distraction: 0, mixed: 0 };
  }
  weekDates.forEach(date => {
    const dayStats = data.dailyStats[date];
    if (dayStats) {
      totalLearning += dayStats.learning || 0;
      totalDistraction += dayStats.distraction || 0;
      totalMixed += dayStats.mixed || 0;
    }
  });
  return {
    totalLearning, totalDistraction, totalMixed,
    bestHours: calculateBestStudyHours(data.dailyStats),
    trend: 'consistent', dates: weekDates, daily: dailyData
  };
}

function createWeeklyChart(weekData) {
  const canvas = document.getElementById('weeklyChart');
  const ctx = canvas.getContext('2d');
  if (weeklyChart) weeklyChart.destroy();
  const labels = weekData.dates.map(date => new Date(date).toLocaleDateString('en-US', { weekday: 'short' }));
  const learningData = weekData.dates.map(date => Math.round((weekData.daily[date]?.learning || 0) / 60));
  const distractionData = weekData.dates.map(date => Math.round((weekData.daily[date]?.distraction || 0) / 60));
  weeklyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Learning', data: learningData,
        backgroundColor: 'rgba(94, 234, 212, 0.9)', borderRadius: 8
      }, {
        label: 'Distraction', data: distractionData,
        backgroundColor: 'rgba(252, 165, 165, 0.9)', borderRadius: 8
      }]
    },
    options: { responsive: true, maintainAspectRatio: true }
  });
}

setInterval(() => {
  loadTodayStats();
  updateCurrentActivity();
  checkDistractionAlert();
  syncStatsToServer();

}, 30000);
