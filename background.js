// Background script for tracking tab activity - INDIAN TIME VERSION

const TRACKING_INTERVAL = 10; // seconds
const IDLE_THRESHOLD = 60; // seconds

// Site classification rules
const LEARNING_SITES = [
  'github.com',
  'stackoverflow.com',
  'coursera.org',
  'udemy.com',
  'khanacademy.org',
  'edx.org',
  'leetcode.com',
  'hackerrank.com',
  'codecademy.com',
  'w3schools.com',
  'mdn.mozilla.org',
  'docs.python.org',
  'docs.microsoft.com',
  'developer.mozilla.org',
  'medium.com',
  'arxiv.org',
  'scholar.google.com',
  'researchgate.net',
  'notion.so',
  'evernote.com',
  'obsidian.md',
  'quizlet.com',
  'duolingo.com',
  'brilliant.org'
];

const DISTRACTION_SITES = [
  'facebook.com',
  'youtube.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  'whatsapp.com',
  'tiktok.com',
  'reddit.com',
  'twitch.tv',
  'netflix.com',
  'hulu.com',
  'disneyplus.com',
  'primevideo.com',
  'spotify.com',
  'soundcloud.com',
  'pinterest.com',
  'snapchat.com',
  '9gag.com',
  'buzzfeed.com',
  'imgur.com',
  'discord.com'
];

const EDUCATIONAL_KEYWORDS = [
  'tutorial', 'learn', 'learning', 'study', 'studying', 'guide', 'how to', 'step by step',
  'lesson', 'lectures', 'lecture notes', 'course', 'curriculum', 'syllabus',
  'revision', 'practice', 'exercise', 'notes', 'handwritten notes',
  'exam', 'test', 'quiz', 'mcq', 'assignment', 'homework',
  'explanation', 'concept', 'theory', 'fundamentals', 'basics', 'introduction',
  'examples', 'worked examples', 'documentation', 'docs',
  'api reference', 'developer guide', 'code', 'coding', 'programming',
  'syntax', 'implementation', 'algorithm', 'data structure',
  'debug', 'error', 'exception', 'stack trace', 'runtime error',
  'interview questions', 'system design', 'open source',
  'repository', 'github repo', 'pull request', 'commit',
  'formula', 'derivation', 'proof', 'theorem', 'corollary',
  'numerical', 'problem solving', 'experiment', 'lab manual',
  'physics', 'chemistry', 'biology', 'mathematics', 'calculus', 'algebra',
  'statistics', 'probability', 'thermodynamics', 'mechanics',
  'quantum', 'electromagnetism', 'education', 'development', 'science', 'math', 'history'
];

// Helper function to get Indian date string (YYYY-MM-DD)
function getIndianDateString() {
  const now = new Date();
  const indianTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return indianTime.toLocaleDateString('en-CA'); // YYYY-MM-DD format
}

// Helper function to get Indian hour
function getIndianHour() {
  const now = new Date();
  const indianTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return indianTime.getHours();
}

// State
let trackingInterval = null;
let currentSession = {
  url: '',
  title: '',
  startTime: Date.now(),
  category: 'mixed'
};

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Student Productivity Tracker installed');
  
  // Initialize storage
  chrome.storage.local.get(['data'], (result) => {
    if (!result.data) {
      chrome.storage.local.set({
        data: {
          sessions: [],
          dailyStats: {}
        }
      });
    }
  });

  // Set up periodic tracking
  chrome.alarms.create('track', { periodInMinutes: TRACKING_INTERVAL / 60 });
  
  // Start tracking immediately
  startTracking();
});

// Start tracking when extension starts
chrome.runtime.onStartup.addListener(() => {
  startTracking();
});

// Handle alarm for periodic tracking
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'track') {
    trackCurrentTab();
  } else if (alarm.name === 'checkDistraction') {
    checkDistractionAlert();
  }
});

// Track when tab changes
chrome.tabs.onActivated.addListener(() => {
  saveCurrentSession();
  trackCurrentTab();
});

// Track when tab updates (URL change)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    saveCurrentSession();
    trackCurrentTab();
  }
});

// Monitor idle state
chrome.idle.setDetectionInterval(IDLE_THRESHOLD);

chrome.idle.onStateChanged.addListener((state) => {
  if (state === 'idle' || state === 'locked') {
    saveCurrentSession();
    stopTracking();
  } else if (state === 'active') {
    startTracking();
  }
});

// Start tracking
function startTracking() {
  if (trackingInterval) return;
  
  trackingInterval = setInterval(() => {
    trackCurrentTab();
  }, TRACKING_INTERVAL * 1000);
  
  trackCurrentTab();
}

// Stop tracking
function stopTracking() {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
  saveCurrentSession();
}

// Track current active tab
async function trackCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url) return;
    
    // Skip chrome:// and extension pages
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      return;
    }

    const url = new URL(tab.url);
    const category = classifyTab(url.hostname, tab.title);

    // Check if this is a new session
    if (currentSession.url !== tab.url) {
      saveCurrentSession();
      
      currentSession = {
        url: tab.url,
        title: tab.title,
        hostname: url.hostname,
        startTime: Date.now(),
        category: category
      };
    }

  } catch (error) {
    console.error('Error tracking tab:', error);
  }
}

// Classify tab into learning/distraction/mixed
function classifyTab(hostname, title) {
  // Check learning sites
  if (LEARNING_SITES.some(site => hostname.includes(site))) {
    return 'learning';
  }

  // Check distraction sites
  if (DISTRACTION_SITES.some(site => hostname.includes(site))) {
    // Special case: YouTube
    if (hostname.includes('youtube.com')) {
      return classifyYouTube(title);
    }
    return 'distraction';
  }

  // Check for educational keywords in title
  const lowerTitle = title.toLowerCase();
  if (EDUCATIONAL_KEYWORDS.some(keyword => lowerTitle.includes(keyword))) {
    return 'learning';
  }

  // Default to mixed
  return 'mixed';
}

// Special handling for YouTube
function classifyYouTube(title) {
  const lowerTitle = title.toLowerCase();
  
  // Check for educational keywords
  if (EDUCATIONAL_KEYWORDS.some(keyword => lowerTitle.includes(keyword))) {
    return 'learning';
  }

  // Check for entertainment keywords
  const entertainmentKeywords = [
    'funny', 'prank', 'reaction', 'vlog', 'gaming',
    'music video', 'trailer', 'meme', 'compilation',
    'fun', 'comedy', 'skit', 'roast', 'parody',
    'shorts', 'reels', 'gameplay', 'playthrough',
    'song', 'songs', 'lyrics', 'dance', 'viral', 'trending'
  ];
  
  if (entertainmentKeywords.some(keyword => lowerTitle.includes(keyword))) {
    return 'distraction';
  }

  return 'distraction';
}

// Save current session to storage
async function saveCurrentSession() {
  if (!currentSession.url) return;

  const duration = Math.floor((Date.now() - currentSession.startTime) / 1000); // seconds
  
  // Only save if session lasted more than 5 seconds
  if (duration < 5) return;

  const date = getIndianDateString(); // Use Indian date
  const hour = getIndianHour(); // Use Indian hour

  try {
    const result = await chrome.storage.local.get(['data']);
    const data = result.data || { sessions: [], dailyStats: {} };

    // Add session
    data.sessions.push({
      url: currentSession.url,
      title: currentSession.title,
      hostname: currentSession.hostname,
      category: currentSession.category,
      duration: duration,
      timestamp: currentSession.startTime,
      date: date,
      hour: hour
    });

    // Initialize today's stats if not exists
    if (!data.dailyStats[date]) {
      data.dailyStats[date] = {
        learning: 0,
        distraction: 0,
        mixed: 0,
        hourly: {}
      };
    }

    // Update daily stats
    data.dailyStats[date][currentSession.category] += duration;

    // Update hourly stats
    if (!data.dailyStats[date].hourly[hour]) {
      data.dailyStats[date].hourly[hour] = {
        learning: 0,
        distraction: 0,
        mixed: 0
      };
    }
    data.dailyStats[date].hourly[hour][currentSession.category] += duration;

    // Keep only last 30 days of data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = new Date(thirtyDaysAgo.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
      .toLocaleDateString('en-CA');

    data.sessions = data.sessions.filter(s => s.date >= cutoffDate);
    Object.keys(data.dailyStats).forEach(date => {
      if (date < cutoffDate) {
        delete data.dailyStats[date];
      }
    });

    await chrome.storage.local.set({ data });

  } catch (error) {
    console.error('Error saving session:', error);
  }

  // Reset current session
  currentSession = {
    url: '',
    title: '',
    startTime: Date.now(),
    category: 'mixed'
  };
}

// Check for distraction alerts periodically
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

    // Check if distraction exceeds learning and is significant (> 1 minute)
    if (todayStats.distraction > todayStats.learning && todayStats.distraction > 60) {
      // Only show alert once every 30 minutes
      const now = Date.now();
      const thirtyMinutes = 30 * 60 * 1000;
      
      if (now - lastAlertTime > thirtyMinutes) {
        const learningMin = Math.floor(todayStats.learning / 60);
        const distractionMin = Math.floor(todayStats.distraction / 60);
        
        chrome.notifications.clear('distraction-alert', () => {
          chrome.notifications.create('distraction-alert', {
            type: 'basic',
            iconUrl: 'icon128.png',
            title: '⚠️ Focus Alert!',
            message: `Distraction (${distractionMin}m) > Learning (${learningMin}m). Time to refocus! 💪`,
            priority: 2,
            requireInteraction: true
          });
        });

        await chrome.storage.local.set({ lastAlertTime: now });
      }
    }
  } catch (error) {
    console.error('Error checking distraction alert:', error);
  }
}

// Run alert check every 1 minute
chrome.alarms.create('checkDistraction', { periodInMinutes: 1 });

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getCurrentActivity') {
    sendResponse({
      category: currentSession.category,
      url: currentSession.url,
      duration: Math.floor((Date.now() - currentSession.startTime) / 1000)
    });
  }
  return true;
});