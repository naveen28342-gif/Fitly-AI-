const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { URL } = require('node:url');
const workoutEngine = require('./workout-engine');

const ROOT = __dirname;
function loadEnvFile(fileName) {
  const filePath = path.join(ROOT, fileName);
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  lines.forEach((line) => {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) return;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  });
}
loadEnvFile('.env.local');
loadEnvFile('.env.google.local');
loadEnvFile('.env');
const PORT = Number(process.env.PORT || 5173);
const HOST = process.env.HOST || '127.0.0.1';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `http://localhost:${PORT}/auth/google/callback`;
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';
const MAX_BODY_BYTES = 1024 * 1024;
const aiRuntime = { status: GEMINI_API_KEY ? 'configured' : 'not_configured', lastError: null, lastErrorAt: null, retryUntil: 0, retryAfterSeconds: 0 };
const DATA_FILE = process.env.FITLY_DATA_FILE ? path.resolve(ROOT, process.env.FITLY_DATA_FILE) : path.join(ROOT, 'data', 'fitly-data.json');
const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_SECRET_KEY = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const SUPABASE_TABLE = String(process.env.SUPABASE_TABLE || 'fitly_users').trim() || 'fitly_users';
const SUPABASE_MIGRATE_FILE = process.env.SUPABASE_MIGRATE_FILE === 'true';
const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_SECRET_KEY);
let persistenceMode = 'file';
const users = new Map();
const sessions = new Map();
const oauthStates = new Map();
const authHandoffs = new Map();

function blankUserRecord(user = null) {
  return { createdAt: new Date().toISOString(), user, profile: null, preferences: null, progressLogs: [], trainingLogs: [], activityLogs: [], chat: [] };
}
function normalizeStoredUser(record = {}) {
  return {
    createdAt: record.createdAt || new Date().toISOString(),
    user: record.user || null,
    profile: record.profile || null,
    preferences: record.preferences || null,
    progressLogs: Array.isArray(record.progressLogs) ? record.progressLogs.slice(-180) : [],
    trainingLogs: Array.isArray(record.trainingLogs) ? record.trainingLogs.slice(-60) : [],
    activityLogs: Array.isArray(record.activityLogs) ? record.activityLogs.slice(-1000) : [],
    chat: Array.isArray(record.chat) ? record.chat.slice(-20) : []
  };
}
function supabaseHeaders(extra = {}) {
  const headers = {
    apikey: SUPABASE_SECRET_KEY,
    'Content-Type': 'application/json',
    ...extra
  };
  if (!SUPABASE_SECRET_KEY.startsWith('sb_')) headers.Authorization = `Bearer ${SUPABASE_SECRET_KEY}`;
  return headers;
}
async function supabaseRequest(endpoint, options = {}) {
  if (!SUPABASE_CONFIGURED) throw new Error('Supabase is not configured');
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, { ...options, headers: supabaseHeaders(options.headers || {}) });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${detail.slice(0, 240)}`);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
function recordToSupabaseRow(id, record) {
  return {
    id,
    created_at: record.createdAt || new Date().toISOString(),
    user_data: record.user || null,
    profile: record.profile || null,
    preferences: record.preferences || null,
    progress_logs: record.progressLogs || [],
    training_logs: record.trainingLogs || [],
    activity_logs: record.activityLogs || [],
    chat: record.chat || []
  };
}
function supabaseRowToRecord(row) {
  return normalizeStoredUser({
    createdAt: row.created_at,
    user: row.user_data,
    profile: row.profile,
    preferences: row.preferences,
    progressLogs: row.progress_logs,
    trainingLogs: row.training_logs,
    activityLogs: row.activity_logs,
    chat: row.chat
  });
}
async function loadSupabaseStore() {
  const rows = await supabaseRequest(`${SUPABASE_TABLE}?select=id,created_at,user_data,profile,preferences,progress_logs,training_logs,activity_logs,chat&limit=10000`);
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    if (row?.id) users.set(String(row.id), supabaseRowToRecord(row));
  });
}
async function migrateFileStoreToSupabase() {
  if (!fs.existsSync(DATA_FILE)) return;
  let saved;
  try { saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (error) { throw new Error(`Could not read file store for migration: ${error.message}`); }
  const records = Object.entries(saved.users || {});
  for (const [id, record] of records) {
    await supabaseRequest(`${SUPABASE_TABLE}?on_conflict=id`, { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(recordToSupabaseRow(id, normalizeStoredUser(record))) });
  }
  if (records.length) console.log(`[fitly] Migrated ${records.length} user record(s) from the file store to Supabase.`);
}
async function persistUserRecord(userId) {
  if (persistenceMode !== 'supabase') {
    persistStore();
    return;
  }
  const record = users.get(userId);
  if (!record) return;
  await supabaseRequest(`${SUPABASE_TABLE}?on_conflict=id`, { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(recordToSupabaseRow(userId, record)) });
}
function queueUserPersistence(userId) {
  persistUserRecord(userId).catch((error) => console.warn(`[fitly] Supabase user save failed: ${error.message}`));
}
async function appendChat(session, userText, assistantText, userId = null) {
  if (!session) return;
  session.chat = [...(session.chat || []), { text: String(userText || ''), type: 'user' }, { text: String(assistantText || ''), type: 'ai' }].slice(-20);
  if (userId) await persistUserRecord(userId);
}
function loadPersistentStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    Object.entries(saved.users || {}).forEach(([id, record]) => users.set(id, normalizeStoredUser(record)));
    Object.entries(saved.sessions || {}).forEach(([id, record]) => {
      if (record?.userId && users.has(record.userId)) sessions.set(id, record);
    });
  } catch (error) {
    console.warn(`[fitly] Persistent store could not be loaded: ${error.message}`);
  }
}
function persistStore() {
  if (persistenceMode === 'supabase') return;
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    const tempFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify({ version: 1, savedAt: new Date().toISOString(), users: Object.fromEntries(users), sessions: Object.fromEntries(sessions) }, null, 2), 'utf8');
    fs.renameSync(tempFile, DATA_FILE);
  } catch (error) {
    console.warn(`[fitly] Persistent store could not be saved: ${error.message}`);
  }
}
function createSessionForUser(user, forcedUserId = null) {
  const userId = String(forcedUserId || user?.id || `guest:${randomToken()}`);
  const record = users.get(userId) || blankUserRecord(user || null);
  if (user) record.user = user;
  users.set(userId, record);
  const sessionId = randomToken();
  sessions.set(sessionId, { userId, createdAt: new Date().toISOString() });
  if (persistenceMode === 'supabase') queueUserPersistence(userId); else persistStore();
  return { id: sessionId, userId, session: record };
}
async function initializeStore() {
  if (SUPABASE_CONFIGURED) {
    try {
      if (SUPABASE_MIGRATE_FILE) await migrateFileStoreToSupabase();
      await loadSupabaseStore();
      persistenceMode = 'supabase';
      console.log(`[fitly] Persistence: Supabase (${SUPABASE_TABLE})`);
      return;
    } catch (error) {
      console.warn(`[fitly] Supabase unavailable, using the local file store: ${error.message}`);
    }
  }
  loadPersistentStore();
  persistenceMode = 'file';
  console.log('[fitly] Persistence: local server file store');
}
const storeReady = initializeStore();

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const mealRotationVersion = 2;
const basePlans = {
  Monday: { title: 'Strong start', type: 'FULL BODY • AT HOME', description: 'A steady full-body circuit to start the week without draining your study battery.', meta: ['06', '3', '130'] },
  Tuesday: { title: 'Reset & recharge', type: 'FULL BODY • AT HOME', description: 'Move through a feel-good strength flow that works in your dorm room, no equipment needed.', meta: ['06', '3', '120'] },
  Wednesday: { title: 'Core & restore', type: 'CORE + MOBILITY • 20 MIN', description: 'A gentle midweek reset to loosen up after long library hours and keep your core switched on.', meta: ['05', '2', '95'] },
  Thursday: { title: 'Lower-body flow', type: 'LOWER BODY • AT HOME', description: 'Build a little heat with simple lower-body patterns and zero jumping around your flatmates.', meta: ['07', '3', '145'] },
  Friday: { title: 'Cardio burst', type: 'CARDIO • SMALL SPACE', description: 'A short, bright burst of movement to close the week with more energy than you started with.', meta: ['05', '4', '160'] },
  Saturday: { title: 'Long stretch', type: 'MOBILITY • EASY DAY', description: 'Slow things down with a longer stretch sequence for hips, shoulders, and a clearer head.', meta: ['08', '1', '70'] },
  Sunday: { title: 'Rest & reset', type: 'RECOVERY • YOUR PACE', description: 'A low-pressure recovery day. Walk, breathe, and let your body be ready for Monday.', meta: ['04', '1', '45'] }
};

const mealSets = {
  'South Indian': [
    ['Breakfast', 'Idli with sambar & boiled eggs', 'Idli · lentils · 2 eggs · coconut chutney', 390],
    ['Lunch', 'Lemon rice power bowl', 'Rice · chickpeas · cucumber · curd', 520],
    ['Snack', 'Peanut butter banana toast', 'Wholegrain bread · banana · peanut butter', 220],
    ['Dinner', 'Paneer bhurji wraps', 'Paneer · roti · peppers · mint chutney', 480]
  ],
  'North Indian': [
    ['Breakfast', 'Besan chilla with curd', 'Gram flour · onion · coriander · curd', 360],
    ['Lunch', 'Rajma rice power bowl', 'Kidney beans · basmati rice · cucumber raita', 510],
    ['Snack', 'Roasted chana & fruit', 'Chana · seasonal fruit · lime', 190],
    ['Dinner', 'Paneer bhurji wraps', 'Paneer · roti · peppers · mint chutney', 480]
  ],
  'Global mix': [
    ['Breakfast', 'Greek yogurt oat bowl', 'Yogurt · oats · banana · seeds', 410],
    ['Lunch', 'Chickpea hummus wrap', 'Chickpeas · roti · greens · tahini', 490],
    ['Snack', 'Peanut butter banana toast', 'Wholegrain bread · banana · peanut butter', 220],
    ['Dinner', 'One-pan tofu rice', 'Tofu · rice · peppers · soy ginger sauce', 470]
  ]
};
// Keep meal variety deterministic so the same user sees a different, culturally
// appropriate menu on each weekday even when the AI fallback is used.
const mealRotations = {
  'South Indian': {
    Breakfast: [
      ['Idli with sambar & boiled eggs', 'Idli - lentils - 2 eggs - coconut chutney', 390],
      ['Vegetable upma & boiled eggs', 'Semolina - vegetables - 2 eggs - chutney', 400],
      ['Pesarattu with curd', 'Green gram dosa - curd - ginger chutney', 380],
      ['Ragi dosa & paneer bhurji', 'Ragi dosa - paneer - tomato chutney', 420],
      ['Ven pongal with sambar', 'Rice - moong dal - sambar - cashews', 430],
      ['Appam with vegetable stew', 'Appam - coconut vegetable stew - lentils', 410],
      ['Uthappam with sambar', 'Vegetable uthappam - sambar - chutney', 400]
    ],
    Lunch: [
      ['Lemon rice power bowl', 'Rice - chickpeas - cucumber - curd', 520],
      ['Curd rice & beans poriyal', 'Rice - curd - green beans - roasted peanuts', 500],
      ['Sambar rice & vegetable poriyal', 'Rice - lentil sambar - seasonal vegetables', 530],
      ['Coconut rice & chickpea sundal', 'Rice - coconut - chickpeas - cucumber salad', 540],
      ['Tomato rice with dal', 'Rice - tomato - dal - carrot poriyal', 510],
      ['Tamarind rice with chana', 'Tamarind rice - black chana - cabbage poriyal', 535],
      ['Millet rice bowl with rasam', 'Millet - rasam - dal - mixed vegetables', 515]
    ],
    Snack: [
      ['Peanut butter banana toast', 'Wholegrain bread - banana - peanut butter', 220],
      ['Sundal & seasonal fruit', 'Chickpea sundal - guava - lime', 210],
      ['Buttermilk & roasted peanuts', 'Buttermilk - peanuts - cucumber', 200],
      ['Banana & peanut chikki', 'Banana - peanut chikki - coconut water', 230],
      ['Corn chaat with curd', 'Sweet corn - curd - onion - lime', 225],
      ['Coconut yogurt & fruit', 'Coconut yogurt - papaya - seeds', 215],
      ['Roasted chana with lime', 'Roasted chana - fruit - lime', 205]
    ],
    Dinner: [
      ['Paneer bhurji wraps', 'Paneer - roti - peppers - mint chutney', 480],
      ['Dosa with paneer filling', 'Dosa - paneer - vegetables - chutney', 495],
      ['Tofu millet bowl', 'Tofu - millet - vegetables - coconut chutney', 470],
      ['Chapati with vegetable kurma', 'Chapati - mixed vegetables - dal - curd', 460],
      ['Lemon pepper paneer with rice', 'Paneer - rice - vegetables - lemon pepper', 500],
      ['Vegetable kothu parotta', 'Parotta - vegetables - tofu scramble - raita', 520],
      ['Sambar dosa with chutney', 'Dosa - sambar - chutney - vegetable salad', 475]
    ]
  },
  'North Indian': {
    Breakfast: [
      ['Besan chilla with curd', 'Gram flour - onion - coriander - curd', 360],
      ['Aloo paratha with curd', 'Whole wheat - potato - curd - mint chutney', 430],
      ['Oats chilla with paneer', 'Oats - vegetables - paneer - chutney', 390],
      ['Moong dal chilla', 'Moong dal - vegetables - curd - coriander', 370],
      ['Poha with peanuts & curd', 'Flattened rice - peanuts - vegetables - curd', 380],
      ['Stuffed paneer paratha', 'Whole wheat - paneer - vegetables - curd', 440],
      ['Vegetable dalia bowl', 'Broken wheat - milk - fruit - seeds', 375]
    ],
    Lunch: [
      ['Rajma rice power bowl', 'Kidney beans - basmati rice - cucumber raita', 510],
      ['Chole with roti', 'Chickpeas - roti - salad - curd', 530],
      ['Dal khichdi with vegetables', 'Rice - moong dal - vegetables - curd', 500],
      ['Paneer tikka rice bowl', 'Paneer - rice - peppers - mint yogurt', 550],
      ['Dal tadka with jeera rice', 'Toor dal - jeera rice - salad - curd', 520],
      ['Soya keema roti bowl', 'Soya mince - roti - peas - cucumber', 515],
      ['Kadhi rice with beans', 'Kadhi - rice - green beans - salad', 495]
    ],
    Snack: [
      ['Roasted chana & fruit', 'Chana - seasonal fruit - lime', 190],
      ['Lassi & roasted makhana', 'Curd lassi - makhana - cardamom', 230],
      ['Sprout chaat', 'Moong sprouts - tomato - onion - lemon', 200],
      ['Peanut banana bowl', 'Banana - peanuts - yogurt - cinnamon', 240],
      ['Makhana trail mix', 'Makhana - almonds - raisins - seeds', 220],
      ['Chana cucumber chaat', 'Chana - cucumber - tomato - lime', 195],
      ['Fruit & paneer cubes', 'Seasonal fruit - paneer - black pepper', 215]
    ],
    Dinner: [
      ['Paneer bhurji wraps', 'Paneer - roti - peppers - mint chutney', 480],
      ['Dal makhani with roti', 'Black dal - roti - salad - curd', 520],
      ['Palak paneer with rice', 'Spinach - paneer - rice - cucumber', 505],
      ['Soya pulao with raita', 'Soya chunks - rice - vegetables - raita', 490],
      ['Chole salad wraps', 'Chickpeas - roti - salad - mint chutney', 465],
      ['Paneer tikka with roti', 'Paneer - roti - peppers - salad', 500],
      ['Moong dal dosa with sabzi', 'Moong dal dosa - seasonal vegetables - curd', 455]
    ]
  },
  'Global mix': {
    Breakfast: [
      ['Greek yogurt oat bowl', 'Yogurt - oats - banana - seeds', 410],
      ['Avocado egg toast', 'Wholegrain toast - avocado - 2 eggs - tomato', 430],
      ['Berry overnight oats', 'Oats - yogurt - berries - chia seeds', 390],
      ['Tofu scramble toast', 'Tofu - wholegrain toast - spinach - tomato', 400],
      ['Banana protein pancakes', 'Oats - banana - yogurt - seeds', 420],
      ['Peanut butter apple oats', 'Oats - apple - peanut butter - cinnamon', 405],
      ['Hummus breakfast wrap', 'Hummus - wholegrain wrap - greens - tofu', 415]
    ],
    Lunch: [
      ['Chickpea hummus wrap', 'Chickpeas - roti - greens - tahini', 490],
      ['Tofu quinoa power bowl', 'Tofu - quinoa - greens - edamame', 520],
      ['Lentil tomato pasta', 'Lentil pasta - tomato - spinach - parmesan', 535],
      ['Black bean burrito bowl', 'Black beans - rice - corn - salsa', 510],
      ['Mediterranean couscous bowl', 'Couscous - chickpeas - cucumber - hummus', 500],
      ['Tofu soba noodle bowl', 'Tofu - soba noodles - vegetables - sesame', 525],
      ['Lentil avocado salad', 'Lentils - avocado - greens - sourdough', 480]
    ],
    Snack: [
      ['Peanut butter banana toast', 'Wholegrain bread - banana - peanut butter', 220],
      ['Yogurt granola cup', 'Greek yogurt - granola - berries - seeds', 230],
      ['Hummus & carrot sticks', 'Hummus - carrots - cucumber - pita', 210],
      ['Apple with peanut butter', 'Apple - peanut butter - pumpkin seeds', 225],
      ['Edamame & fruit', 'Edamame - seasonal fruit - sea salt', 205],
      ['Cottage cheese berry cup', 'Cottage cheese - berries - almonds', 240],
      ['Trail mix & orange', 'Nuts - seeds - raisins - orange', 235]
    ],
    Dinner: [
      ['One-pan tofu rice', 'Tofu - rice - peppers - soy ginger sauce', 470],
      ['Paneer quinoa fajita bowl', 'Paneer - quinoa - peppers - salsa', 510],
      ['Lentil curry with naan', 'Lentils - naan - vegetables - yogurt', 500],
      ['Tofu stir-fry noodles', 'Tofu - noodles - vegetables - sesame sauce', 490],
      ['Chickpea tomato pasta', 'Chickpeas - pasta - tomato - spinach', 505],
      ['Baked tofu with sweet potato', 'Tofu - sweet potato - broccoli - tahini', 480],
      ['Bean quesadilla & salad', 'Beans - wholegrain tortilla - cheese - salad', 515]
    ]
  }
};
function personalizeMealSet(food, diet = 'omnivore', requestedDate = null, variation = 0) {
  const selectedSet = mealSets[food] || mealSets['South Indian'];
  const rotation = mealRotations[food] || mealRotations['South Indian'];
  const date = requestedDate ? getDateInfo(requestedDate) : null;
  const baseDayIndex = date ? Math.max(0, dayNames.indexOf(date.day)) : 0;
  const dayIndex = (baseDayIndex + Math.max(0, Math.floor(Number(variation) || 0))) % 7;
  return selectedSet.map(([meal, title, ingredients, kcal]) => {
    const variant = rotation?.[meal]?.[dayIndex] || [title, ingredients, kcal];
    const selectedTitle = variant[0];
    const selectedIngredients = variant[1];
    const selectedKcal = variant[2];
    if (diet === 'vegan') return [meal, selectedTitle.replace(/boiled eggs|eggs|paneer|curd|yogurt|cheese/gi, (item) => item.toLowerCase().includes('paneer') || item.toLowerCase().includes('egg') ? 'tofu' : 'coconut yogurt'), selectedIngredients.replace(/eggs|paneer|curd|yogurt|cheese/gi, (item) => item.toLowerCase().includes('paneer') || item.toLowerCase().includes('egg') ? 'tofu' : 'coconut yogurt'), selectedKcal];
    if (diet === 'vegetarian') return [meal, selectedTitle.replace(/boiled eggs|eggs/gi, 'tofu scramble'), selectedIngredients.replace(/eggs/gi, 'tofu'), selectedKcal];
    return [meal, selectedTitle, selectedIngredients, selectedKcal];
  });
}

function sendJson(response, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...extraHeaders
  });
  response.end(body);
}

function redirect(response, location, extraHeaders = {}) {
  response.writeHead(302, { Location: location, ...extraHeaders });
  response.end();
}
function randomToken() { return crypto.randomBytes(32).toString('hex'); }
function parseCookies(request) {
  return Object.fromEntries((request.headers.cookie || '').split(';').map((part) => part.trim().split('=').map(decodeURIComponent)).filter(([key]) => key));
}
function cookieHeader(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.secure || COOKIE_SECURE) parts.push('Secure');
  return parts.join('; ');
}
function getSession(request) {
  const sessionId = parseCookies(request).fitly_sid;
  const session = sessionId ? sessions.get(sessionId) : null;
  return session?.userId ? users.get(session.userId) || null : null;
}
function getSessionUserId(request) {
  const sessionId = parseCookies(request).fitly_sid;
  return sessionId ? sessions.get(sessionId)?.userId || null : null;
}
function getOrCreateSession(request) {
  const cookies = parseCookies(request);
  const existing = cookies.fitly_sid ? sessions.get(cookies.fitly_sid) : null;
  if (existing?.userId && users.has(existing.userId)) return { id: cookies.fitly_sid, userId: existing.userId, session: users.get(existing.userId), newSession: false };
  const storedGuestId = /^guest:[a-f0-9]{64}$/.test(String(cookies.fitly_guest_id || '')) ? cookies.fitly_guest_id : null;
  const created = createSessionForUser(null, storedGuestId || `guest:${randomToken()}`);
  return { id: created.id, userId: created.userId, session: created.session, newSession: true, guestId: created.userId, setGuestCookie: !storedGuestId };
}
function sessionHeaders(sessionInfo) {
  const cookies = [];
  if (sessionInfo?.newSession) cookies.push(cookieHeader('fitly_sid', sessionInfo.id, { maxAge: 60 * 60 * 24 * 30 }));
  if (sessionInfo?.setGuestCookie && sessionInfo.guestId) cookies.push(cookieHeader('fitly_guest_id', sessionInfo.guestId, { maxAge: 60 * 60 * 24 * 365 }));
  return cookies.length ? { 'Set-Cookie': cookies } : {};
}
function normalizeProfile(profile = {}) {
  profile = profile || {};
  const numberOrNull = (value) => {
    if (value === '' || value === undefined || value === null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  return {
    age: numberOrNull(profile.age),
    weight: numberOrNull(profile.weight),
    height: numberOrNull(profile.height),
    sex: ['male', 'female', 'unspecified'].includes(profile.sex) ? profile.sex : 'unspecified',
    activity: ['sedentary', 'light', 'moderate', 'very', 'extreme'].includes(profile.activity) ? profile.activity : 'moderate',
    experience: ['beginner', 'intermediate', 'advanced'].includes(profile.experience) ? profile.experience : 'beginner',
    fitnessLevel: String(profile.fitnessLevel || '').slice(0, 120),
    equipment: String(profile.equipment || '').slice(0, 120),
    exercisePreferences: String(profile.exercisePreferences || '').slice(0, 500),
    exercisesToAvoid: String(profile.exercisesToAvoid || '').slice(0, 500),
    currentLifts: String(profile.currentLifts || '').slice(0, 500),
    split: ['auto', 'full_body', 'upper_lower', 'ppl'].includes(profile.split) ? profile.split : 'auto',
    trainingDays: numberOrNull(profile.trainingDays),
    sessionMinutes: numberOrNull(profile.sessionMinutes),
    dailySteps: numberOrNull(profile.dailySteps),
    bodyFat: numberOrNull(profile.bodyFat),
    targetBodyFat: numberOrNull(profile.targetBodyFat),
    diet: ['omnivore', 'vegetarian', 'vegan'].includes(profile.diet) ? profile.diet : 'omnivore',
    sleepHours: numberOrNull(profile.sleepHours),
    sleepQuality: ['poor', 'okay', 'good'].includes(profile.sleepQuality) ? profile.sleepQuality : 'okay',
    soreness: numberOrNull(profile.soreness),
    fatigue: numberOrNull(profile.fatigue),
    stress: numberOrNull(profile.stress),
    restingHeartRate: numberOrNull(profile.restingHeartRate),
    healthIssues: String(profile.healthIssues || '').slice(0, 1000),
    surgery: String(profile.surgery || '').slice(0, 1000),
    goal: ['Bulking', 'Fat loss', 'Strength training'].includes(profile.goal) ? profile.goal : 'Strength training',
    consent: Boolean(profile.consent),
    termsAccepted: Boolean(profile.termsAccepted),
    termsAcceptedAt: profile.termsAccepted ? String(profile.termsAcceptedAt || new Date().toISOString()).slice(0, 80) : null,
    updatedAt: new Date().toISOString()
  };
}

const activityFactors = { sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725, extreme: 1.9 };
function roundNumber(value, decimals = 0) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
function calculateNutrition(profile = {}) {
  const userProfile = normalizeProfile(profile);
  if (!userProfile.age || !userProfile.weight || !userProfile.height) return null;
  const sexAdjustment = userProfile.sex === 'male' ? 5 : userProfile.sex === 'female' ? -161 : -78;
  const bmr = 10 * userProfile.weight + 6.25 * userProfile.height - 5 * userProfile.age + sexAdjustment;
  const activityFactor = activityFactors[userProfile.activity] || activityFactors.moderate;
  const tdee = bmr * activityFactor;
  const goal = userProfile.goal;
  const multiplier = goal === 'Bulking' ? 1.1 : goal === 'Fat loss' ? 0.85 : 1;
  const targetCalories = Math.round(tdee * multiplier);
  const proteinRange = goal === 'Fat loss' ? [1.8, 2.4] : [1.6, 2.2];
  const proteinMin = roundNumber(userProfile.weight * proteinRange[0]);
  const proteinMax = roundNumber(userProfile.weight * proteinRange[1]);
  const proteinTarget = Math.round((proteinMin + proteinMax) / 2);
  const fatMin = roundNumber(userProfile.weight * 0.6);
  const fatMax = roundNumber(userProfile.weight * 1);
  const fatTarget = Math.round(userProfile.weight * 0.8);
  const carbsTarget = Math.max(0, Math.round((targetCalories - proteinTarget * 4 - fatTarget * 9) / 4));
  const fiberTarget = Math.round(targetCalories * 14 / 1000);
  const weightTrend = goal === 'Bulking' ? { direction: 'gain', min: roundNumber(userProfile.weight * 0.001, 2), max: roundNumber(userProfile.weight * 0.0025, 2), unit: 'kg/week' } : goal === 'Fat loss' ? { direction: 'loss', min: roundNumber(userProfile.weight * 0.005, 2), max: roundNumber(userProfile.weight * 0.01, 2), unit: 'kg/week' } : { direction: 'maintain', min: 0, max: 0, unit: 'kg/week' };
  const heightMeters = userProfile.height / 100;
  const bmi = roundNumber(userProfile.weight / (heightMeters * heightMeters), 1);
  const leanMass = userProfile.bodyFat ? roundNumber(userProfile.weight * (1 - userProfile.bodyFat / 100), 1) : null;
  const fatMass = leanMass === null ? null : roundNumber(userProfile.weight - leanMass, 1);
  const targetBodyFat = userProfile.targetBodyFat || (goal === 'Fat loss' && userProfile.bodyFat ? Math.max(10, userProfile.bodyFat - 5) : null);
  const goalWeight = leanMass !== null && targetBodyFat && targetBodyFat < 100 ? roundNumber(leanMass / (1 - targetBodyFat / 100), 1) : null;
  return {
    bmr: Math.round(bmr), tdee: Math.round(tdee), activityFactor, targetCalories, goal,
    maintenanceCalories: Math.round(tdee),
    bulkCalories: { min: Math.round(tdee * 1.05), target: Math.round(tdee * 1.1), max: Math.round(tdee * 1.15) },
    cutCalories: { min: Math.round(tdee * 0.75), target: Math.round(tdee * 0.85), max: Math.round(tdee * 0.9) },
    recompCalories: Math.round(tdee),
    protein: { min: proteinMin, max: proteinMax, target: proteinTarget },
    fat: { min: fatMin, max: fatMax, target: fatTarget },
    carbs: { target: carbsTarget }, fiber: { target: fiberTarget }, proteinPerMeal: { min: roundNumber(userProfile.weight * 0.3), max: roundNumber(userProfile.weight * 0.5) }, weightTrend,
    bmi, leanMass, fatMass, targetBodyFat, goalWeight,
    estimateNote: 'Starting estimate. Recheck your 7-day average weight after 2–3 weeks before adjusting by 100–200 kcal.'
  };
}

function normalizeProgressLog(log = {}) {
  const numberOrNull = (value) => {
    if (value === '' || value === undefined || value === null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const date = new Date(log.date || Date.now());
  return {
    id: String(log.id || randomToken()).slice(0, 80),
    date: Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString(),
    weight: numberOrNull(log.weight), waist: numberOrNull(log.waist), chest: numberOrNull(log.chest), arms: numberOrNull(log.arms), legs: numberOrNull(log.legs), bodyFat: numberOrNull(log.bodyFat),
    calories: numberOrNull(log.calories), protein: numberOrNull(log.protein), steps: numberOrNull(log.steps), water: numberOrNull(log.water), sleepHours: numberOrNull(log.sleepHours), restingHeartRate: numberOrNull(log.restingHeartRate),
    sleepQuality: ['poor', 'okay', 'good'].includes(log.sleepQuality) ? log.sleepQuality : null,
    soreness: numberOrNull(log.soreness), fatigue: numberOrNull(log.fatigue), stress: numberOrNull(log.stress), workoutCompleted: Boolean(log.workoutCompleted),
    note: String(log.note || '').slice(0, 500)
  };
}
function normalizeTrainingLog(log = {}) {
  const numberOrNull = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const date = new Date(log.date || Date.now());
  return { id: String(log.id || randomToken()).slice(0, 80), date: Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString(), exercise: String(log.exercise || 'Main movement').slice(0, 100), load: numberOrNull(log.load), reps: numberOrNull(log.reps), rpe: numberOrNull(log.rpe) };
}
function normalizeActivityLog(log = {}) {
  const date = new Date(log.date || Date.now());
  const type = ['workout', 'meal', 'exercise', 'event'].includes(log.type) ? log.type : null;
  const data = log.data && typeof log.data === 'object' ? log.data : {};
  return { id: String(log.id || randomToken()).slice(0, 100), type, event: String(log.event || '').slice(0, 80), data, date: Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString(), day: String(log.day || '').slice(0, 20), meal: String(log.meal || '').slice(0, 40), exercise: String(log.exercise || '').slice(0, 100), index: Number.isFinite(Number(log.index)) ? Number(log.index) : null, completed: Boolean(log.completed), durationSeconds: Number.isFinite(Number(log.durationSeconds)) ? Math.max(0, Number(log.durationSeconds)) : null, kcal: Number.isFinite(Number(log.kcal)) ? Math.max(0, Number(log.kcal)) : null };
}
async function savePlanSnapshot(request, plan) {
  const session = getSession(request);
  const userId = getSessionUserId(request);
  const day = String(plan?.date?.day || '').slice(0, 20);
  if (!session || !userId || !day || !plan) return;
  const log = normalizeActivityLog({ id: `plan-${day}-${Date.now()}`, type: 'event', event: 'plan_generated', date: new Date().toISOString(), day, data: { day, plan } });
  session.activityLogs = [...(session.activityLogs || []).filter((item) => !(item.type === 'event' && item.event === 'plan_generated' && item.day === day)), log].slice(-1000);
  await persistUserRecord(userId);
}
function trainingRecommendation(log) {
  if (!log) return 'Log a top set to get a recommendation.';
  if (log.reps >= 10 && log.rpe <= 8) return 'Add a small load increase next time and keep the same rep range.';
  if (log.rpe <= 8) return `Keep the load and aim for ${log.reps + 1} reps next time.`;
  return 'Repeat the same load until the set feels closer to RPE 8. Technique first.';
}
function average(values) {
  const usable = values.filter((value) => Number.isFinite(value));
  return usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : null;
}
function analyzeProgress(profile = {}, logs = []) {
  const userProfile = normalizeProfile(profile);
  const nutrition = calculateNutrition(userProfile);
  const safeLogs = Array.isArray(logs) ? logs : [];
  const sorted = safeLogs.map(normalizeProgressLog).sort((a, b) => new Date(a.date) - new Date(b.date));
  const weightLogs = sorted.filter((log) => Number.isFinite(log.weight));
  const recentAverage = average(weightLogs.slice(-7).map((log) => log.weight));
  const previousAverage = average(weightLogs.slice(-14, -7).map((log) => log.weight));
  const weeklyChange = recentAverage !== null && previousAverage !== null ? roundNumber(recentAverage - previousAverage, 2) : null;
  const target = nutrition?.weightTrend || null;
  let action = 'hold';
  let adjustment = 0;
  let headline = 'Keep collecting your baseline.';
  let message = 'Log a few consistent weigh-ins and recovery check-ins so Fitly can adapt from trends instead of one-off numbers.';
  if (weeklyChange !== null && target) {
    const absoluteChange = Math.abs(weeklyChange);
    const tooSlow = target.direction === 'gain' ? weeklyChange < target.min * 0.7 : target.direction === 'loss' ? weeklyChange > -target.min * 0.7 : absoluteChange > 0.2;
    const tooFast = target.direction === 'gain' ? weeklyChange > target.max * 1.3 : target.direction === 'loss' ? weeklyChange < -target.max * 1.3 : false;
    if (tooSlow) {
      action = target.direction === 'loss' ? 'increase_activity_or_reduce' : 'increase_calories';
      adjustment = target.direction === 'loss' ? -100 : 150;
      headline = target.direction === 'loss' ? 'The loss trend is slower than target.' : 'The gain trend is slower than target.';
      message = target.direction === 'loss' ? 'Hold your routine for a few more days, then consider 100–200 fewer kcal or a small step increase if the 14-day trend stays flat.' : 'Consider adding about 100–200 kcal/day if your 14-day average keeps moving below the gain target.';
    } else if (tooFast) {
      action = 'reduce_calories';
      adjustment = target.direction === 'loss' ? 100 : -150;
      headline = target.direction === 'loss' ? 'The loss trend is faster than target.' : 'The gain trend is faster than target.';
      message = target.direction === 'loss' ? 'Consider adding 100–200 kcal/day and review recovery if this pace continues.' : 'Consider reducing about 100–200 kcal/day to keep the gain controlled.';
    } else {
      headline = 'Your weight trend is in range.';
      message = 'Keep calories, steps, and training steady. The trend is more useful than any single weigh-in.';
    }
  }
  const latest = sorted.at(-1) || null;
  const sleepHours = latest?.sleepHours ?? userProfile.sleepHours;
  const fatigue = latest?.fatigue ?? userProfile.fatigue;
  const soreness = latest?.soreness ?? userProfile.soreness;
  const recoveryState = (sleepHours !== null && sleepHours < 6.5) || (fatigue !== null && fatigue >= 4) || (soreness !== null && soreness >= 4) ? 'reduce' : 'train';
  const recoveryMessage = recoveryState === 'reduce' ? 'Recovery looks limited today. Reduce volume, keep technique crisp, or choose a recovery session.' : 'Recovery signals look ready for your planned session.';
  return { entries: sorted.length, recentAverage: recentAverage === null ? null : roundNumber(recentAverage, 1), previousAverage: previousAverage === null ? null : roundNumber(previousAverage, 1), weeklyChange, action, adjustment, headline, message, recoveryState, recoveryMessage, latest, nutrition };
}

function getJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request body too large'));
        request.destroy();
        return;
      }
      body += chunk;
    });
    request.on('end', () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); } catch { reject(new Error('Invalid JSON body')); }
    });
    request.on('error', reject);
  });
}

function normalizePreferences(preferences = {}) {
  return {
    goal: String(preferences.goal || 'Build strength'),
    food: String(preferences.food || 'South Indian'),
    equipment: String(preferences.equipment || 'Dorm-friendly'),
    budget: String(preferences.budget || '₹2,500 / month')
  };
}

function getDateInfo(value) {
  const date = value ? new Date(value) : new Date();
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const day = dayNames[(validDate.getDay() + 6) % 7];
  return {
    iso: validDate.toISOString(),
    day,
    label: validDate.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  };
}

function buildLegacyPlan(preferences, requestedDate, profile = {}, progressLogs = []) {
  const prefs = normalizePreferences(preferences);
  const userProfile = normalizeProfile(profile);
  const hasProfileGoal = Boolean(profile && profile.goal);
  const date = getDateInfo(requestedDate);
  const adaptation = analyzeProgress(userProfile, progressLogs);
  const workout = { ...(basePlans[date.day] || basePlans.Tuesday) };
  if (hasProfileGoal && userProfile.goal === 'Bulking') {
    workout.title = 'Progressive power';
    workout.type = 'STRENGTH • CONTROLLED';
    workout.description = 'A progressive strength session that gives you enough stimulus to build without taking over your whole day.';
    workout.meta = ['07', '4', '175'];
  } else if (hasProfileGoal && userProfile.goal === 'Fat loss') {
    workout.title = 'Lean & steady';
    workout.type = 'FULL BODY • LOW IMPACT';
    workout.description = 'A steady full-body session with simple movements and enough recovery to keep your energy useful.';
    workout.meta = ['06', '3', '140'];
  } else if ((hasProfileGoal && userProfile.goal === 'Strength training') || prefs.goal === 'Build strength') {
    workout.title = 'Strength foundations';
    workout.type = 'STRENGTH • AT HOME';
    workout.description = 'Build a reliable strength base with controlled reps, simple progressions, and no complicated setup.';
    workout.meta = ['06', '3', '130'];
  } else if (prefs.goal === 'Get more energy') {
    workout.title = date.day === 'Sunday' ? 'Walk & reset' : 'Energy lift';
    workout.type = 'LOW IMPACT • ENERGY';
    workout.description = 'A bright, low-impact session designed to leave you more alert for classes, not wiped out.';
  } else if (prefs.goal === 'Feel more flexible') {
    workout.title = 'Open & unwind';
    workout.type = 'MOBILITY • AT HOME';
    workout.description = 'A slower mobility flow for shoulders, hips, and the stiffness that comes with long study sessions.';
    workout.meta = ['05', '2', '75'];
  }
  if (adaptation.recoveryState === 'reduce') {
    workout.title = 'Recovery reset';
    workout.type = 'RECOVERY • LOW IMPACT';
    workout.description = 'A lighter session for a lower-energy day: mobility, breathing, and controlled movement without chasing fatigue.';
    workout.meta = ['04', '2', '65'];
  } else if (userProfile.sessionMinutes && userProfile.sessionMinutes <= 20) {
    workout.description = `${workout.description} A focused ${userProfile.sessionMinutes}-minute version keeps the essentials.`;
    workout.meta = ['04', '3', '90'];
  }
  if (prefs.equipment === 'Gym access') workout.type = workout.type.replace('AT HOME', 'GYM OPTIONAL');
  const meals = personalizeMealSet(prefs.food, userProfile.diet, requestedDate).map(([meal, title, ingredients, kcal], index) => ({ meal, title, ingredients, kcal, done: index < 2 }));
  return { date, preferences: prefs, profile: userProfile, nutrition: calculateNutrition(userProfile), adaptation, workout, meals, mealRotationVersion, generatedAt: new Date().toISOString(), source: 'server' };
}

function buildPlan(preferences, requestedDate, profile = {}, progressLogs = [], variation = 0) {
  const prefs = normalizePreferences(preferences);
  const userProfile = normalizeProfile(profile);
  const date = getDateInfo(requestedDate);
  const adaptation = analyzeProgress(userProfile, progressLogs);
  const week = workoutEngine.buildWeek(userProfile, prefs, adaptation);
  const currentEntry = week.find((entry) => entry.day === date.day);
  const regeneration = Math.max(0, Math.floor(Number(variation) || 0));
  const alternateSplits = {
    'Full body A': ['Full body B', 'Upper A', 'Push'],
    'Full body B': ['Full body A', 'Lower A', 'Pull'],
    'Upper A': ['Upper B', 'Push', 'Full body A'],
    'Upper B': ['Upper A', 'Pull', 'Full body B'],
    'Lower A': ['Lower B', 'Legs', 'Full body A'],
    'Lower B': ['Lower A', 'Legs B', 'Full body B'],
    Push: ['Push B', 'Upper A', 'Full body A'],
    Pull: ['Pull B', 'Upper B', 'Full body B'],
    Legs: ['Legs B', 'Lower A', 'Full body A'],
    'Push B': ['Push', 'Upper B', 'Full body B'],
    'Pull B': ['Pull', 'Upper A', 'Full body A'],
    'Legs B': ['Legs', 'Lower B', 'Full body B']
  };
  const alternateSplit = regeneration && currentEntry?.isTraining ? alternateSplits[currentEntry.split]?.[(regeneration - 1) % alternateSplits[currentEntry.split].length] : null;
  let workout = alternateSplit ? workoutEngine.buildWorkout(date.day, alternateSplit, userProfile, prefs, adaptation) : currentEntry?.workout || workoutEngine.buildWorkout(date.day, 'Full body A', userProfile, prefs, adaptation);
  let recoveryVariant = null;
  if (!alternateSplit && regeneration && currentEntry && !currentEntry.isTraining) {
    const recoveryVariants = [
      { title: 'Mobility reset', type: 'RECOVERY - MOBILITY', description: 'A gentle mobility sequence to loosen your hips, shoulders, and back without adding fatigue.', names: ['Gentle walk & breathing', 'Cat-cow flow', 'Open-book rotation', 'Long-exhale reset'] },
      { title: 'Walk & restore', type: 'RECOVERY - EASY MOVEMENT', description: 'A relaxed walk and mobility session to support circulation, energy, and tomorrow’s training.', names: ['Easy walk', '90/90 hip switches', 'Wall angels', 'Box breathing'] },
      { title: 'Stretch & reset', type: 'RECOVERY - FLEXIBILITY', description: 'A calm full-body reset for a busy day. Keep every movement comfortable and conversational.', names: ['Easy march', 'Half-kneeling hip stretch', 'Thread-the-needle', 'Relaxed breathing'] }
    ][(regeneration - 1) % 3];
    recoveryVariant = recoveryVariants;
    workout = { ...workout, ...recoveryVariant, meta: ['04', '2', '65'], exercises: workout.exercises.map((item, index) => ({ ...item, name: recoveryVariant.names[index] || item.name })) };
  }
  if ((alternateSplit || recoveryVariant) && currentEntry) {
    currentEntry.split = alternateSplit;
    currentEntry.title = workout.title;
    currentEntry.type = workout.type;
    currentEntry.focus = workout.focus;
    currentEntry.duration = workout.duration;
    currentEntry.workout = workout;
  }
  const meals = personalizeMealSet(prefs.food, userProfile.diet, requestedDate, regeneration).map(([meal, title, ingredients, kcal], index) => ({ meal, title, ingredients, kcal, done: index < 2 }));
  return { date, preferences: prefs, profile: userProfile, nutrition: calculateNutrition(userProfile), adaptation, workout, week, meals, mealRotationVersion, generatedAt: new Date().toISOString(), source: 'server', variation: regeneration };
}

function parseModelJson(text) {
  const cleaned = String(text || '').trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  try { return JSON.parse(cleaned); } catch { return null; }
}

async function askGemini(message, systemInstruction, generationConfig = {}) {
  if (!GEMINI_API_KEY || typeof fetch !== 'function') {
    aiRuntime.status = 'not_configured';
    return null;
  }
  if (aiRuntime.retryUntil > Date.now()) {
    const error = new Error('Gemini is temporarily rate limited');
    error.code = 'AI_RATE_LIMITED';
    error.retryAfterSeconds = Math.ceil((aiRuntime.retryUntil - Date.now()) / 1000);
    throw error;
  }
  if (aiRuntime.status !== 'connected') {
    aiRuntime.status = 'configured';
  }
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: message }] }],
      generationConfig: { temperature: 0.65, maxOutputTokens: 320, ...generationConfig }
    })
  });
  if (!response.ok) {
    const retryAfterHeader = Number(response.headers.get('retry-after'));
    const retryAfterSeconds = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0 ? Math.min(300, retryAfterHeader) : response.status === 429 ? 60 : 0;
    aiRuntime.status = response.status === 429 ? 'rate_limited' : 'error';
    aiRuntime.lastError = response.status === 429 ? 'Gemini quota or rate limit reached' : `Gemini returned HTTP ${response.status}`;
    aiRuntime.lastErrorAt = new Date().toISOString();
    aiRuntime.retryAfterSeconds = retryAfterSeconds;
    aiRuntime.retryUntil = retryAfterSeconds ? Date.now() + retryAfterSeconds * 1000 : 0;
    const error = new Error(aiRuntime.lastError);
    error.code = response.status === 429 ? 'AI_RATE_LIMITED' : 'AI_REQUEST_FAILED';
    error.status = response.status;
    error.retryAfterSeconds = retryAfterSeconds;
    throw error;
  }
  const result = await response.json();
  aiRuntime.status = 'connected';
  aiRuntime.lastError = null;
  aiRuntime.lastErrorAt = null;
  aiRuntime.retryUntil = 0;
  aiRuntime.retryAfterSeconds = 0;
  return result.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim() || null;
}

async function buildGeminiPlan(preferences, requestedDate, profile = {}, progressLogs = [], variation = 0) {
  if (!GEMINI_API_KEY) return null;
  const prefs = normalizePreferences(preferences);
  const userProfile = normalizeProfile(profile);
  const date = getDateInfo(requestedDate);
  const instructions = 'You are Fitly, a practical student fitness planner. Return only valid JSON. Create safe, realistic, budget-aware plans. Do not diagnose conditions or prescribe treatment. Do not facilitate extreme calorie restriction, purging, compensatory exercise, or dangerous rapid weight loss. Keep exercises low-impact unless the user explicitly asks otherwise.';
  const adaptation = analyzeProgress(userProfile, progressLogs);
  const prompt = `Create a personalized plan for ${date.day}, ${date.label}. This is regeneration version ${Math.max(0, Math.floor(Number(variation) || 0))}; choose meaningfully different exercises, workout title, meals, and ingredients from the previous version when the version is greater than zero. Preferences: ${JSON.stringify(prefs)}. User profile: ${JSON.stringify(userProfile)}. Progress adaptation: ${JSON.stringify(adaptation)}. Return exactly this JSON shape: {"workout":{"title":"string","type":"string","description":"string","meta":["exercises","rounds","kcal"]},"meals":[{"meal":"Breakfast|Lunch|Snack|Dinner","title":"string","ingredients":"short ingredient list","kcal":0}]}. Use the ${userProfile.goal} focus, four meals, familiar ${prefs.food} food, ingredients that fit ${prefs.budget}, and ${prefs.equipment} constraints. This is the ${date.day} menu: vary the dishes and ingredients by weekday and do not repeat a generic identical menu every day. Respect ${userProfile.experience} experience, a ${userProfile.sessionMinutes || 30}-minute session, and the ${userProfile.diet} diet; do not include animal products for vegan users. If health issues or surgery history are present, keep the plan conservative and explicitly encourage professional clearance.`;
  const text = await askGemini(prompt, instructions, { responseMimeType: 'application/json', maxOutputTokens: 850 });
  const generated = parseModelJson(text);
  if (!generated?.workout || !Array.isArray(generated.meals) || generated.meals.length < 4) return null;
  const fallback = buildPlan(prefs, requestedDate, userProfile, progressLogs, variation);
  return {
    ...fallback,
    workout: { ...fallback.workout, ...generated.workout, exercises: fallback.workout.exercises, warmup: fallback.workout.warmup, cooldown: fallback.workout.cooldown, progression: fallback.workout.progression, recovery: fallback.workout.recovery, weeklyVolume: fallback.workout.weeklyVolume, tracking: fallback.workout.tracking, meta: Array.isArray(generated.workout.meta) ? generated.workout.meta.slice(0, 3).map(String) : fallback.workout.meta },
    meals: generated.meals.slice(0, 4).map((meal, index) => ({ meal: meal.meal || fallback.meals[index].meal, title: meal.title || fallback.meals[index].title, ingredients: meal.ingredients || fallback.meals[index].ingredients, kcal: Number(meal.kcal) || fallback.meals[index].kcal, done: index < 2 })),
    mealRotationVersion,
    generatedAt: new Date().toISOString(),
    profile: userProfile,
    source: 'gemini'
  };
}

function googleConfigReady() { return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET); }
function googleAuthUrl(state) {
  const query = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account'
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`;
}
async function handleGoogleCallback(request, response, requestUrl) {
  const state = requestUrl.searchParams.get('state') || '';
  const cookies = parseCookies(request);
  if (!state || !oauthStates.has(state) || cookies.fitly_oauth_state !== state) return redirect(response, '/?auth=invalid_state');
  oauthStates.delete(state);
  const providerError = requestUrl.searchParams.get('error');
  if (providerError) return redirect(response, `/?auth=denied&reason=${encodeURIComponent(providerError.slice(0, 48))}`);
  const code = requestUrl.searchParams.get('code');
  if (!code) return redirect(response, '/?auth=missing_code');
  let failureStage = 'token_exchange';
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, redirect_uri: GOOGLE_REDIRECT_URI, grant_type: 'authorization_code' })
    });
    const tokenPayload = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok) throw new Error(`Google token exchange returned ${tokenPayload.error || tokenResponse.status}`);
    const token = tokenPayload;
    failureStage = 'userinfo';
    const userResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${token.access_token}` } });
    if (!userResponse.ok) throw new Error(`Google userinfo returned ${userResponse.status}`);
    const googleUser = await userResponse.json();
    const signedInUser = { id: googleUser.sub, name: googleUser.name || googleUser.email, email: googleUser.email, picture: googleUser.picture || '' };
    const createdSession = createSessionForUser(signedInUser);
    const sessionId = createdSession.id;
    const handoff = randomToken();
    authHandoffs.set(handoff, { sessionId, expiresAt: Date.now() + 60 * 1000 });
    setTimeout(() => authHandoffs.delete(handoff), 60 * 1000);
    return redirect(response, `/?signed_in=1&auth_handoff=${encodeURIComponent(handoff)}`, { 'Set-Cookie': [cookieHeader('fitly_sid', sessionId, { maxAge: 60 * 60 * 24 * 30 }), cookieHeader('fitly_oauth_state', '', { maxAge: 0 })] });
  } catch (error) {
    console.warn(`[fitly] Google sign-in failed: ${error.message}`);
    const reason = error.message.includes('invalid_client') ? 'invalid_client' : failureStage;
    return redirect(response, `/?auth=failed&stage=${encodeURIComponent(reason)}`);
  }
}
function handleGoogleStart(request, response) {
  if (!googleConfigReady()) return redirect(response, '/?auth=not_configured');
  const state = randomToken();
  oauthStates.set(state, { createdAt: Date.now() });
  setTimeout(() => oauthStates.delete(state), 10 * 60 * 1000);
  return redirect(response, googleAuthUrl(state), { 'Set-Cookie': cookieHeader('fitly_oauth_state', state, { maxAge: 600 }) });
}
async function verifyGoogleCredential(credential) {
  if (!GOOGLE_CLIENT_ID) throw new Error('Google client ID is not configured');
  const tokenResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if (!tokenResponse.ok) throw new Error(`Google credential verification returned ${tokenResponse.status}`);
  const token = await tokenResponse.json();
  if (token.aud !== GOOGLE_CLIENT_ID) throw new Error('Google credential audience mismatch');
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(token.iss)) throw new Error('Google credential issuer mismatch');
  if (Number(token.exp) * 1000 < Date.now()) throw new Error('Google credential expired');
  if (!token.sub || !token.email) throw new Error('Google credential has no account identity');
  return { id: token.sub, name: token.name || token.email, email: token.email, picture: token.picture || '' };
}

function localReply(message, context = {}) {
  const lower = String(message || '').toLowerCase();
  const food = context.preferences?.food || 'South Indian';
  if (/(chest pain|faint|fainted|trouble breathing|severe pain|heart racing|emergency)/i.test(lower)) return 'Please stop the workout and seek urgent medical help for those symptoms. Fitly cannot assess emergencies or replace a clinician.';
  if (/(purge|vomit|starve|not eat|eating disorder|binge|as little as possible)/i.test(lower)) return 'I’m sorry you’re dealing with this. I can’t help plan extreme restriction or compensatory exercise. Please speak with a qualified healthcare professional or a trusted person today.';
  if (context.progressLogs?.length >= 14) {
    const weights = context.progressLogs.slice(-7).map((log) => Number(log.weight)).filter(Number.isFinite);
    const previous = context.progressLogs.slice(-14, -7).map((log) => Number(log.weight)).filter(Number.isFinite);
    if (weights.length && previous.length) return `Your recent 7-day average is ${average(weights).toFixed(1)} kg versus ${average(previous).toFixed(1)} kg before that. Use the trend, not one weigh-in, and I can help adjust the plan gradually.`;
  }
  if (lower.includes('20') || lower.includes('short')) return 'Absolutely. I trimmed today to three rounds: squats, incline push-ups, and dead bugs. You’ll be done in about 20 minutes.';
  if (lower.includes('swap') || lower.includes('dinner') || lower.includes('vegetarian')) return `Try a one-pan chickpea pulao with cucumber raita. It pairs well with your ${food} preferences and stays budget-friendly.`;
  if (lower.includes('prep') || lower.includes('15')) return 'Start with the rice bowl base: use pre-cooked beans, microwave rice, cucumber, and curd. Add lemon and chilli at the end.';
  return 'I’ll keep it realistic: low-impact movement, familiar ingredients, and enough flexibility for a full student day. Want to change the workout, a meal, or the timing?';
}

async function handleApi(request, response, pathname) {
  await storeReady;
  if (request.method === 'OPTIONS') return sendJson(response, 204, {});
  if (request.method === 'GET' && pathname === '/api/health') {
    let aiStatus = aiRuntime.status;
    if (!GEMINI_API_KEY || typeof fetch !== 'function') {
      aiStatus = 'not_configured';
    } else if (aiRuntime.retryUntil > Date.now()) {
      aiStatus = 'rate_limited';
    } else if (aiStatus !== 'connected') {
      aiStatus = 'configured';
      aiRuntime.status = 'configured';
      aiRuntime.retryAfterSeconds = 0;
    }
    return sendJson(response, 200, { ok: true, now: new Date().toISOString(), aiConfigured: Boolean(GEMINI_API_KEY), aiProvider: 'gemini', model: GEMINI_MODEL, aiStatus, aiLastError: aiRuntime.lastError, aiRetryAfterSeconds: aiRuntime.retryAfterSeconds, persistence: persistenceMode, supabaseConfigured: SUPABASE_CONFIGURED, googleConfigured: googleConfigReady(), googleClientId: GOOGLE_CLIENT_ID || null, googleRedirectUri: GOOGLE_REDIRECT_URI });
  }
  if (request.method === 'GET' && pathname === '/api/session') {
    let session = getSession(request);
    let headers = {};
    if (!session) {
      const guestId = parseCookies(request).fitly_guest_id;
      if (/^guest:[a-f0-9]{64}$/.test(String(guestId || ''))) {
        const restored = createSessionForUser(null, guestId);
        session = restored.session;
        headers = sessionHeaders({ id: restored.id, newSession: true });
      }
    }
    return sendJson(response, 200, { ok: true, authenticated: Boolean(session?.user), user: session?.user || null, profile: session?.profile || null, preferences: session?.preferences || null, chat: session?.chat || [], googleConfigured: googleConfigReady() }, headers);
  }
  if (request.method === 'GET' && pathname === '/api/progress') {
    const session = getSession(request);
    const logs = session?.progressLogs || [];
    return sendJson(response, 200, { ok: true, logs, analysis: analyzeProgress(session?.profile || {}, logs) });
  }
  if (request.method === 'GET' && pathname === '/api/training') {
    const session = getSession(request);
    return sendJson(response, 200, { ok: true, logs: session?.trainingLogs || [] });
  }
  if (request.method === 'GET' && pathname === '/api/activity') {
    const session = getSession(request);
    return sendJson(response, 200, { ok: true, logs: session?.activityLogs || [] });
  }
  if (request.method === 'POST' && pathname === '/api/logout') {
    const sessionId = parseCookies(request).fitly_sid;
    if (sessionId) {
      sessions.delete(sessionId);
      persistStore();
    }
    return sendJson(response, 200, { ok: true }, { 'Set-Cookie': cookieHeader('fitly_sid', '', { maxAge: 0 }) });
  }
  if (request.method !== 'POST') return sendJson(response, 405, { error: 'Method not allowed' });
  let body;
  try { body = await getJsonBody(request); } catch (error) { return sendJson(response, 400, { error: error.message }); }
  if (pathname === '/api/auth/session') {
    const handoff = String(body.handoff || '').trim();
    const entry = authHandoffs.get(handoff);
    if (!entry || entry.expiresAt < Date.now()) return sendJson(response, 401, { error: 'Sign-in handoff expired' });
    authHandoffs.delete(handoff);
    const sessionMeta = sessions.get(entry.sessionId);
    const session = sessionMeta?.userId ? users.get(sessionMeta.userId) : null;
    if (!session?.user) return sendJson(response, 401, { error: 'Sign-in session not found' });
    return sendJson(response, 200, { ok: true, authenticated: true, user: session.user, profile: session.profile || null, preferences: session.preferences || null, chat: session.chat || [] }, { 'Set-Cookie': cookieHeader('fitly_sid', entry.sessionId, { maxAge: 60 * 60 * 24 * 30 }) });
  }
  if (pathname === '/api/auth/google') {
    if (!String(body.credential || '').trim()) return sendJson(response, 400, { error: 'Google credential is required' });
    try {
      const googleUser = await verifyGoogleCredential(String(body.credential).trim());
      const createdSession = createSessionForUser(googleUser);
      return sendJson(response, 200, { ok: true, authenticated: true, user: createdSession.session.user, profile: createdSession.session.profile || null, preferences: createdSession.session.preferences || null, chat: createdSession.session.chat || [] }, { 'Set-Cookie': cookieHeader('fitly_sid', createdSession.id, { maxAge: 60 * 60 * 24 * 30 }) });
    } catch (error) {
      console.warn(`[fitly] Google GIS sign-in failed: ${error.message}`);
      return sendJson(response, 401, { error: 'Google sign-in could not be verified' });
    }
  }
  if (pathname === '/api/onboarding') {
    if (!body.profile || !body.profile.consent || !body.profile.termsAccepted) return sendJson(response, 400, { error: 'Health consent and Terms acceptance are required before creating a plan' });
    const sessionInfo = getOrCreateSession(request);
    sessionInfo.session.profile = normalizeProfile(body.profile);
    if (body.preferences) sessionInfo.session.preferences = normalizePreferences(body.preferences);
    const requestedName = String(body.user?.name || '').trim();
    if (requestedName) {
      sessionInfo.session.user = sessionInfo.session.user
        ? { ...sessionInfo.session.user, name: requestedName.slice(0, 80) }
        : { name: requestedName.slice(0, 80), email: String(body.user?.email || '').slice(0, 160) };
    }
    await persistUserRecord(sessionInfo.userId);
    const plan = await buildGeminiPlan(body.preferences || {}, body.date, sessionInfo.session.profile, sessionInfo.session.progressLogs || []).catch(() => null) || buildPlan(body.preferences || {}, body.date, sessionInfo.session.profile, sessionInfo.session.progressLogs || []);
    const headers = sessionHeaders(sessionInfo);
    return sendJson(response, 200, { ok: true, profile: sessionInfo.session.profile, user: sessionInfo.session.user, preferences: sessionInfo.session.preferences || null, plan }, headers);
  }
  if (pathname === '/api/preferences') {
    const sessionInfo = getOrCreateSession(request);
    sessionInfo.session.preferences = normalizePreferences(body.preferences || {});
    await persistUserRecord(sessionInfo.userId);
    const headers = sessionHeaders(sessionInfo);
    return sendJson(response, 200, { ok: true, preferences: sessionInfo.session.preferences }, headers);
  }
  if (pathname === '/api/progress') {
    const sessionInfo = getOrCreateSession(request);
    const log = normalizeProgressLog(body.log || body);
    if (![log.weight, log.steps, log.calories, log.waist, log.chest, log.arms, log.legs, log.bodyFat, log.water].some(Number.isFinite)) return sendJson(response, 400, { error: 'Add at least one body, activity, or nutrition measure' });
    sessionInfo.session.progressLogs = [...(sessionInfo.session.progressLogs || []), log].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-180);
    await persistUserRecord(sessionInfo.userId);
    const headers = sessionHeaders(sessionInfo);
    return sendJson(response, 200, { ok: true, log, logs: sessionInfo.session.progressLogs, analysis: analyzeProgress(sessionInfo.session.profile || {}, sessionInfo.session.progressLogs) }, headers);
  }
  if (pathname === '/api/training') {
    const sessionInfo = getOrCreateSession(request);
    const log = normalizeTrainingLog(body.log || body);
    if (!Number.isFinite(log.load) || !Number.isFinite(log.reps) || !Number.isFinite(log.rpe)) return sendJson(response, 400, { error: 'Load, reps, and RPE are required' });
    sessionInfo.session.trainingLogs = [...(sessionInfo.session.trainingLogs || []), log].slice(-60);
    await persistUserRecord(sessionInfo.userId);
    const headers = sessionHeaders(sessionInfo);
    return sendJson(response, 200, { ok: true, log, logs: sessionInfo.session.trainingLogs, recommendation: trainingRecommendation(log) }, headers);
  }
  if (pathname === '/api/activity') {
    const sessionInfo = getOrCreateSession(request);
    const log = normalizeActivityLog(body.log || body);
    if (!log.type) return sendJson(response, 400, { error: 'Activity type must be workout, meal, exercise, or event' });
    sessionInfo.session.activityLogs = [...(sessionInfo.session.activityLogs || []), log].slice(-1000);
    await persistUserRecord(sessionInfo.userId);
    const headers = sessionHeaders(sessionInfo);
    return sendJson(response, 200, { ok: true, log, logs: sessionInfo.session.activityLogs }, headers);
  }
  if (pathname === '/api/plan') {
    try {
      const session = getSession(request);
      const profile = body.profile || session?.profile || {};
      const progressLogs = session?.progressLogs || body.progressLogs || [];
      const variation = Math.max(0, Math.floor(Number(body.variation) || 0));
      const plan = await buildGeminiPlan(body.preferences, body.date, profile, progressLogs, variation) || buildPlan(body.preferences, body.date, profile, progressLogs, variation);
      await savePlanSnapshot(request, plan);
      return sendJson(response, 200, { ok: true, plan });
    } catch (error) {
      const session = getSession(request);
      console.warn(`[fitly] Gemini plan fallback: ${error.message}`);
      const variation = Math.max(0, Math.floor(Number(body.variation) || 0));
      const plan = buildPlan(body.preferences, body.date, body.profile || session?.profile || {}, session?.progressLogs || body.progressLogs || [], variation);
      await savePlanSnapshot(request, plan);
      return sendJson(response, 200, { ok: true, plan, source: 'server-fallback' });
    }
  }
  if (pathname === '/api/chat') {
    if (!String(body.message || '').trim()) return sendJson(response, 400, { error: 'Message is required' });
    try {
      const instructions = 'You are Fitly, a practical student fitness planner. Give concise, supportive, culturally aware workout and food suggestions using the user profile, progress logs, recovery signals, and current plan. Respect the user’s budget, equipment, food preferences, and schedule. Do not diagnose conditions or replace medical advice. Never facilitate extreme restriction, purging, compensatory exercise, or dangerous rapid weight loss. For chest pain, fainting, trouble breathing, severe pain, or other urgent symptoms, tell the user to stop and seek urgent medical help. Encourage qualified professional guidance for injuries, surgery recovery, eating disorders, or medical conditions.';
       const session = getSession(request);
       const userId = getSessionUserId(request);
       const context = { ...(body.context || {}), profile: body.profile || session?.profile || body.context?.profile || null, progressLogs: session?.progressLogs || body.context?.progressLogs || [] };
       const reply = await askGemini(JSON.stringify({ message: body.message, context }), instructions, { maxOutputTokens: 260 });
       const replyText = reply || localReply(body.message, context);
       await appendChat(session, body.message, replyText, userId);
       return sendJson(response, 200, { ok: true, reply: replyText, source: reply ? 'ai' : 'local', reason: reply ? null : aiRuntime.status, retryAfterSeconds: aiRuntime.retryAfterSeconds || 0 });
    } catch (error) {
      console.warn(`[fitly] Gemini fallback: ${error.message}`);
       const session = getSession(request);
       const userId = getSessionUserId(request);
       const context = { ...(body.context || {}), profile: body.profile || session?.profile || body.context?.profile || null, progressLogs: session?.progressLogs || body.context?.progressLogs || [] };
       const replyText = localReply(body.message, context);
       await appendChat(session, body.message, replyText, userId);
       return sendJson(response, 200, { ok: true, reply: replyText, source: 'local', fallback: true, reason: error.code === 'AI_RATE_LIMITED' ? 'rate_limited' : aiRuntime.status, retryAfterSeconds: error.retryAfterSeconds || aiRuntime.retryAfterSeconds || 0 });
    }
  }
  return sendJson(response, 404, { error: 'API route not found' });
}

const mimeTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' };
function serveNotFoundPage(request, response) {
  const notFoundFile = path.resolve(ROOT, '404.html');
  if (!fs.existsSync(notFoundFile)) return sendJson(response, 404, { error: 'Not found' });
  response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', 'Content-Security-Policy-Report-Only': "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:; object-src 'none'; base-uri 'self'" });
  if (request.method === 'HEAD') return response.end();
  return fs.createReadStream(notFoundFile).pipe(response);
}
function serveStatic(request, response, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.resolve(ROOT, `.${requested}`);
  if ((filePath !== ROOT && !filePath.startsWith(`${ROOT}${path.sep}`)) || filePath === path.resolve(DATA_FILE) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return serveNotFoundPage(request, response);
  const extension = path.extname(filePath).toLowerCase();
  response.writeHead(200, { 'Content-Type': mimeTypes[extension] || 'application/octet-stream', 'Cache-Control': ['.html', '.js', '.css'].includes(extension) ? 'no-cache' : 'public, max-age=3600', 'Content-Security-Policy-Report-Only': "default-src 'self'; script-src 'self' https://accounts.google.com/gsi/client; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; frame-src 'self' https://accounts.google.com/gsi/; connect-src 'self' https://accounts.google.com/gsi/ https://accounts.google.com; object-src 'none'; base-uri 'self'" });
  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  await storeReady;
  const requestUrl = new URL(request.url, `http://${request.headers.host || HOST}`);
  if (request.method === 'GET' && requestUrl.pathname === '/auth/google') return handleGoogleStart(request, response);
  if (request.method === 'GET' && requestUrl.pathname === '/auth/google/callback') return handleGoogleCallback(request, response, requestUrl);
  if (requestUrl.pathname.startsWith('/api/')) return handleApi(request, response, requestUrl.pathname);
  if (request.method !== 'GET' && request.method !== 'HEAD') return sendJson(response, 405, { error: 'Method not allowed' });
  return serveStatic(request, response, requestUrl.pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`Fitly is running at http://${HOST}:${PORT}`);
  console.log(`AI provider: ${GEMINI_API_KEY ? `${GEMINI_MODEL} configured` : 'local fallback (set GEMINI_API_KEY to enable live Gemini)'}`);
});

process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
