const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const mealTimes = ['08:00', '13:00', '16:30', '20:00'];
const fallbackMeals = {
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
const fallbackMealVariants = {
  'South Indian': {
    Breakfast: [
      ['Idli with sambar & boiled eggs', 'Idli - lentils - 2 eggs - coconut chutney'],
      ['Vegetable upma & boiled eggs', 'Semolina - vegetables - 2 eggs - chutney'],
      ['Pesarattu with curd', 'Green gram dosa - curd - ginger chutney'],
      ['Ragi dosa & paneer bhurji', 'Ragi dosa - paneer - tomato chutney'],
      ['Ven pongal with sambar', 'Rice - moong dal - sambar - cashews'],
      ['Appam with vegetable stew', 'Appam - coconut vegetable stew - lentils'],
      ['Uthappam with sambar', 'Vegetable uthappam - sambar - chutney']
    ],
    Lunch: [
      ['Lemon rice power bowl', 'Rice - chickpeas - cucumber - curd'],
      ['Curd rice & beans poriyal', 'Rice - curd - green beans - roasted peanuts'],
      ['Sambar rice & vegetable poriyal', 'Rice - lentil sambar - seasonal vegetables'],
      ['Coconut rice & chickpea sundal', 'Rice - coconut - chickpeas - cucumber salad'],
      ['Tomato rice with dal', 'Rice - tomato - dal - carrot poriyal'],
      ['Tamarind rice with chana', 'Tamarind rice - black chana - cabbage poriyal'],
      ['Millet rice bowl with rasam', 'Millet - rasam - dal - mixed vegetables']
    ],
    Snack: [
      ['Peanut butter banana toast', 'Wholegrain bread - banana - peanut butter'],
      ['Sundal & seasonal fruit', 'Chickpea sundal - guava - lime'],
      ['Buttermilk & roasted peanuts', 'Buttermilk - peanuts - cucumber'],
      ['Banana & peanut chikki', 'Banana - peanut chikki - coconut water'],
      ['Corn chaat with curd', 'Sweet corn - curd - onion - lime'],
      ['Coconut yogurt & fruit', 'Coconut yogurt - papaya - seeds'],
      ['Roasted chana with lime', 'Roasted chana - fruit - lime']
    ],
    Dinner: [
      ['Paneer bhurji wraps', 'Paneer - roti - peppers - mint chutney'],
      ['Dosa with paneer filling', 'Dosa - paneer - vegetables - chutney'],
      ['Tofu millet bowl', 'Tofu - millet - vegetables - coconut chutney'],
      ['Chapati with vegetable kurma', 'Chapati - mixed vegetables - dal - curd'],
      ['Lemon pepper paneer with rice', 'Paneer - rice - vegetables - lemon pepper'],
      ['Vegetable kothu parotta', 'Parotta - vegetables - tofu scramble - raita'],
      ['Sambar dosa with chutney', 'Dosa - sambar - chutney - vegetable salad']
    ]
  },
  'North Indian': {
    Breakfast: [
      ['Besan chilla with curd', 'Gram flour - onion - coriander - curd'],
      ['Aloo paratha with curd', 'Whole wheat - potato - curd - mint chutney'],
      ['Oats chilla with paneer', 'Oats - vegetables - paneer - chutney'],
      ['Moong dal chilla', 'Moong dal - vegetables - curd - coriander'],
      ['Poha with peanuts & curd', 'Flattened rice - peanuts - vegetables - curd'],
      ['Stuffed paneer paratha', 'Whole wheat - paneer - vegetables - curd'],
      ['Vegetable dalia bowl', 'Broken wheat - milk - fruit - seeds']
    ],
    Lunch: [
      ['Rajma rice power bowl', 'Kidney beans - basmati rice - cucumber raita'],
      ['Chole with roti', 'Chickpeas - roti - salad - curd'],
      ['Dal khichdi with vegetables', 'Rice - moong dal - vegetables - curd'],
      ['Paneer tikka rice bowl', 'Paneer - rice - peppers - mint yogurt'],
      ['Dal tadka with jeera rice', 'Toor dal - jeera rice - salad - curd'],
      ['Soya keema roti bowl', 'Soya mince - roti - peas - cucumber'],
      ['Kadhi rice with beans', 'Kadhi - rice - green beans - salad']
    ],
    Snack: [
      ['Roasted chana & fruit', 'Chana - seasonal fruit - lime'],
      ['Lassi & roasted makhana', 'Curd lassi - makhana - cardamom'],
      ['Sprout chaat', 'Moong sprouts - tomato - onion - lemon'],
      ['Peanut banana bowl', 'Banana - peanuts - yogurt - cinnamon'],
      ['Makhana trail mix', 'Makhana - almonds - raisins - seeds'],
      ['Chana cucumber chaat', 'Chana - cucumber - tomato - lime'],
      ['Fruit & paneer cubes', 'Seasonal fruit - paneer - black pepper']
    ],
    Dinner: [
      ['Paneer bhurji wraps', 'Paneer - roti - peppers - mint chutney'],
      ['Dal makhani with roti', 'Black dal - roti - salad - curd'],
      ['Palak paneer with rice', 'Spinach - paneer - rice - cucumber'],
      ['Soya pulao with raita', 'Soya chunks - rice - vegetables - raita'],
      ['Chole salad wraps', 'Chickpeas - roti - salad - mint chutney'],
      ['Paneer tikka with roti', 'Paneer - roti - peppers - salad'],
      ['Moong dal dosa with sabzi', 'Moong dal dosa - seasonal vegetables - curd']
    ]
  },
  'Global mix': {
    Breakfast: [
      ['Greek yogurt oat bowl', 'Yogurt - oats - banana - seeds'],
      ['Avocado egg toast', 'Wholegrain toast - avocado - 2 eggs - tomato'],
      ['Berry overnight oats', 'Oats - yogurt - berries - chia seeds'],
      ['Tofu scramble toast', 'Tofu - wholegrain toast - spinach - tomato'],
      ['Banana protein pancakes', 'Oats - banana - yogurt - seeds'],
      ['Peanut butter apple oats', 'Oats - apple - peanut butter - cinnamon'],
      ['Hummus breakfast wrap', 'Hummus - wholegrain wrap - greens - tofu']
    ],
    Lunch: [
      ['Chickpea hummus wrap', 'Chickpeas - roti - greens - tahini'],
      ['Tofu quinoa power bowl', 'Tofu - quinoa - greens - edamame'],
      ['Lentil tomato pasta', 'Lentil pasta - tomato - spinach - parmesan'],
      ['Black bean burrito bowl', 'Black beans - rice - corn - salsa'],
      ['Mediterranean couscous bowl', 'Couscous - chickpeas - cucumber - hummus'],
      ['Tofu soba noodle bowl', 'Tofu - soba noodles - vegetables - sesame'],
      ['Lentil avocado salad', 'Lentils - avocado - greens - sourdough']
    ],
    Snack: [
      ['Peanut butter banana toast', 'Wholegrain bread - banana - peanut butter'],
      ['Yogurt granola cup', 'Greek yogurt - granola - berries - seeds'],
      ['Hummus & carrot sticks', 'Hummus - carrots - cucumber - pita'],
      ['Apple with peanut butter', 'Apple - peanut butter - pumpkin seeds'],
      ['Edamame & fruit', 'Edamame - seasonal fruit - sea salt'],
      ['Cottage cheese berry cup', 'Cottage cheese - berries - almonds'],
      ['Trail mix & orange', 'Nuts - seeds - raisins - orange']
    ],
    Dinner: [
      ['One-pan tofu rice', 'Tofu - rice - peppers - soy ginger sauce'],
      ['Paneer quinoa fajita bowl', 'Paneer - quinoa - peppers - salsa'],
      ['Lentil curry with naan', 'Lentils - naan - vegetables - yogurt'],
      ['Tofu stir-fry noodles', 'Tofu - noodles - vegetables - sesame sauce'],
      ['Chickpea tomato pasta', 'Chickpeas - pasta - tomato - spinach'],
      ['Baked tofu with sweet potato', 'Tofu - sweet potato - broccoli - tahini'],
      ['Bean quesadilla & salad', 'Beans - wholegrain tortilla - cheese - salad']
    ]
  }
};
const fallbackWorkouts = {
  Monday: { title: 'Strong start', type: 'FULL BODY • AT HOME', description: 'A steady full-body circuit to start the week without draining your study battery.', meta: ['06', '3', '130'] },
  Tuesday: { title: 'Reset & recharge', type: 'FULL BODY • AT HOME', description: 'Move through a feel-good strength flow that works in your dorm room, no equipment needed.', meta: ['06', '3', '120'] },
  Wednesday: { title: 'Core & restore', type: 'CORE + MOBILITY • 20 MIN', description: 'A gentle midweek reset to loosen up after long library hours and keep your core switched on.', meta: ['05', '2', '95'] },
  Thursday: { title: 'Lower-body flow', type: 'LOWER BODY • AT HOME', description: 'Build a little heat with simple lower-body patterns and zero jumping around your flatmates.', meta: ['07', '3', '145'] },
  Friday: { title: 'Cardio burst', type: 'CARDIO • SMALL SPACE', description: 'A short, bright burst of movement to close the week with more energy than you started with.', meta: ['05', '4', '160'] },
  Saturday: { title: 'Long stretch', type: 'MOBILITY • EASY DAY', description: 'Slow things down with a longer stretch sequence for hips, shoulders, and a clearer head.', meta: ['08', '1', '70'] },
  Sunday: { title: 'Rest & reset', type: 'RECOVERY • YOUR PACE', description: 'A low-pressure recovery day. Walk, breathe, and let your body be ready for Monday.', meta: ['04', '1', '45'] }
};

const defaultState = {
  preferences: { goal: 'Build strength', food: 'South Indian', equipment: 'Dorm-friendly', budget: '₹2,500 / month' },
  profile: null,
  user: null,
  onboardingComplete: false,
  completionVersion: 2,
  completedMeals: { Breakfast: false, Lunch: false, Snack: false, Dinner: false },
  mealLogs: [],
  manualFoods: [],
  groceryManualItems: [],
  groceryChecked: {},
  exerciseCompletion: {},
  workouts: {},
  progressLogs: [],
  trainingLogs: [],
  progressAnalysis: null,
  selectedDay: null,
  chat: []
};

const STATE_KEY = 'fitly_state_v2';
function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return { ...structuredClone(defaultState), ...saved };
    }
  } catch { /* ignore parse errors */ }
  return structuredClone(defaultState);
}
function saveState() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch { /* ignore quota errors */ }
}

let state = loadState();
let activePlan = null;
let activeDay = dayNames[(new Date().getDay() + 6) % 7]; // always start on today
let planRequestId = 0;
let workoutLibraryMode = 'week';
let toastTimer;
let workoutTimer;

function showToast(message) {
  $('.toast-text').textContent = message;
  $('.toast').classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('.toast').classList.remove('is-visible'), 2800);
}
function parseLocalDate(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return value instanceof Date ? new Date(value) : new Date(value);
}
function dateKey(value = new Date()) {
  const date = parseLocalDate(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function startOfDay(value = new Date()) {
  const date = parseLocalDate(value);
  date.setHours(0, 0, 0, 0);
  return date;
}
function daysFromToday(offset) {
  const date = startOfDay();
  date.setDate(date.getDate() + offset);
  return date;
}
function startOfCurrentWeek(value = new Date()) {
  const date = startOfDay(value);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}
function weekDateAt(index) {
  const date = startOfCurrentWeek();
  date.setDate(date.getDate() + index);
  return date;
}
function dayNameFromDate(date = new Date()) {
  const parsed = parseLocalDate(date);
  return dayNames[(parsed.getDay() + 6) % 7];
}
function endOfMonth(date = new Date()) {
  const parsed = parseLocalDate(date);
  return new Date(parsed.getFullYear(), parsed.getMonth() + 1, 0);
}
function buildMonthlyWorkoutPlans(profile = {}, preferences = state.preferences, adaptation = state.progressAnalysis || analyzeProgress(state.progressLogs, profile)) {
  const engine = window.FitlyWorkoutEngine;
  const weekEntries = engine ? engine.buildWeek(profile, preferences, adaptation) : weekSchedule(profile);
  const scheduleMap = new Map(weekEntries.map((entry) => [entry.day, entry]));
  const plans = [];
  const today = startOfDay();
  // Start from the 1st of the current month, end on the last day of the current month
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = endOfMonth(today);
  const current = new Date(start);
  while (current <= end) {
    const day = dayNameFromDate(current);
    const entry = scheduleMap.get(day) || { day, split: 'Recovery / mobility', isTraining: false };
    const workout = engine ? engine.buildWorkout(day, entry.split, profile, preferences, adaptation) : localSummaryPlan(day);
    plans.push({ date: new Date(current), day, workout, split: entry.split, isTraining: entry.isTraining, status: entry.isTraining ? 'Planned' : 'Recovery' });
    current.setDate(current.getDate() + 1);
  }
  return plans;
}
function updateWorkoutLibraryToggle() {
  $$('.library-view-all').forEach((button) => {
    const label = workoutLibraryMode === 'month' ? 'Show weekly workouts' : 'View all workouts';
    button.innerHTML = `${label} <svg class="icon"><use href="#icon-arrow"/></svg>`;
  });
}
function inCurrentWeek(value) {
  const date = startOfDay(value);
  const start = startOfCurrentWeek();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return date >= start && date < end;
}
function inRecentDays(value, days = 7) {
  const date = startOfDay(value);
  const start = startOfDay();
  start.setDate(start.getDate() - (days - 1));
  return date >= start && date <= startOfDay();
}
function workoutElapsedSeconds(log = {}, now = Date.now()) {
  const savedSeconds = Math.max(0, Number(log.elapsedSeconds) || 0);
  const activeStartedAt = Number(log.activeStartedAt || log.startedAt);
  if (!Number.isFinite(activeStartedAt) || log.pausedAt || log.completedAt) return Math.floor(savedSeconds || Number(log.durationSeconds) || 0);
  return Math.max(0, Math.floor(savedSeconds + (now - activeStartedAt) / 1000));
}
function workoutExerciseStatus(day = activeDay) {
  const exercises = activePlan?.workout?.exercises || [];
  const completed = exercises.reduce((count, exercise, index) => count + (state.exerciseCompletion[exerciseCompletionKey(day, exercise, index)]?.completedAt ? 1 : 0), 0);
  return { total: exercises.length, completed, allComplete: exercises.length > 0 && completed === exercises.length };
}
function mealCompletionSnapshot() {
  const latest = new Map();
  (state.mealLogs || []).forEach((log) => {
    if (!log?.meal || !log.date) return;
    latest.set(`${dateKey(log.date)}:${log.meal}`, log);
  });
  return [...latest.values()].filter((log) => log.completed);
}
function getLiveStats() {
  const now = Date.now();
  const today = dateKey();
  const completedWorkouts = Object.entries(state.workouts || {}).map(([day, log]) => ({ day, ...log })).filter((log) => log.completedAt);
  const workoutDates = new Set(completedWorkouts.map((log) => dateKey(log.completedAt)));
  const mealLogs = mealCompletionSnapshot();
  const weekWorkouts = completedWorkouts.filter((log) => inCurrentWeek(log.completedAt));
  const monthWorkouts = completedWorkouts.filter((log) => inRecentDays(log.completedAt, 30));
  const weekMeals = mealLogs.filter((log) => inCurrentWeek(log.date));
  const monthMeals = mealLogs.filter((log) => inRecentDays(log.date, 30));
  const trainingTarget = Math.max(1, Number(state.profile?.trainingDays) || activePlan?.week?.filter((entry) => entry.isTraining).length || 3);
  const weekStart = startOfCurrentWeek();
  const elapsedWeekDays = Math.max(1, Math.floor((startOfDay() - weekStart) / 86400000) + 1);
  const workoutScore = Math.min(50, Math.round((weekWorkouts.length / trainingTarget) * 50));
  const mealScore = Math.min(30, Math.round((weekMeals.length / (elapsedWeekDays * 4)) * 30));
  const checkinScore = Math.min(20, Math.round((state.progressLogs.filter((log) => inCurrentWeek(log.date)).length / 3) * 20));
  const weeklyScore = Math.min(100, workoutScore + mealScore + checkinScore);
  let streak = 0;
  for (let index = 0; index < 365 && workoutDates.has(dateKey(daysFromToday(-index))); index += 1) streak += 1;
  const activeSeconds = completedWorkouts.reduce((total, log) => total + (Number(log.durationSeconds) || 0), 0) + Object.values(state.workouts || {}).filter((log) => log.startedAt && !log.completedAt).reduce((total, log) => total + workoutElapsedSeconds(log, now), 0);
  const todayMeals = mealLogs.filter((log) => dateKey(log.date) === today).length;
  const todayWorkout = completedWorkouts.some((log) => dateKey(log.completedAt) === today);
  const todayExercises = Object.entries(state.exerciseCompletion || {}).filter(([key, log]) => key.startsWith(`${activeDay}:`) && log?.completedAt && dateKey(log.completedAt) === today).length;
  const exerciseTarget = activePlan?.workout?.exercises?.length || 0;
  const workoutProgress = todayWorkout ? 1 : exerciseTarget ? Math.min(1, todayExercises / exerciseTarget) : 0;
  const mealProgress = Math.min(1, todayMeals / Math.max(1, activePlan?.meals?.length || 4));
  const todayScore = Math.round(((mealProgress + workoutProgress) / 2) * 100);
  const stepLogs = state.progressLogs.filter((log) => inRecentDays(log.date, 7) && Number.isFinite(Number(log.steps)));
  const averageSteps = stepLogs.length ? Math.round(stepLogs.reduce((sum, log) => sum + Number(log.steps), 0) / stepLogs.length) : null;
  const dailyBars = Array.from({ length: 7 }, (_, index) => {
    const key = dateKey(weekDateAt(index));
    const workouts = completedWorkouts.filter((log) => dateKey(log.completedAt) === key);
    const meals = mealLogs.filter((log) => dateKey(log.date) === key);
    const minutes = workouts.reduce((sum, log) => sum + (Number(log.durationSeconds) || 0) / 60, 0);
    return { key, workouts: workouts.length, meals: meals.length, value: Math.min(100, Math.round(minutes * 1.4 + meals.length * 7)) };
  });
  return { completedWorkouts, weekWorkouts, monthWorkouts, weekMeals, monthMeals, trainingTarget, weeklyScore, todayScore, streak, activeSeconds, todayMeals, todayWorkout, todayExercises, exerciseTarget, averageSteps, dailyBars, workoutDates, todayKey: today };
}
function renderLiveProgress() {
  const stats = getLiveStats();
  const ring = $('.ring-value');
  if (ring) ring.style.strokeDashoffset = `${264 - (264 * stats.todayScore / 100)}`;
  $('.progress-ring strong').textContent = stats.todayScore;
  $('.streak-copy strong').textContent = `${stats.streak} day streak`;
  $('.streak-copy p').textContent = stats.todayWorkout ? 'Workout complete today. Keep the rhythm going.' : stats.todayExercises ? `${stats.todayExercises}/${stats.exerciseTarget} exercises checked today.` : stats.streak ? 'Complete today\'s session to keep the streak going.' : 'Complete a workout to start your live streak.';
  $$('.mini-days span').forEach((day, index) => day.classList.toggle('is-done', stats.workoutDates.has(stats.dailyBars[index]?.key)));
  $$('.day-tab').forEach((tab) => tab.classList.toggle('is-complete', Boolean(state.workouts[tab.dataset.day]?.completedAt)));
  const glanceTrend = $('.glance-card .trend-up');
  if (glanceTrend) glanceTrend.textContent = `${stats.weeklyScore}% score`;
  $$('.glance-card .bar-set span').forEach((bar, index) => { bar.style.height = `${Math.max(6, stats.dailyBars[index]?.value || 0)}%`; bar.classList.toggle('bar-active', stats.dailyBars[index]?.key === stats.todayKey && stats.dailyBars[index]?.value > 0); });
  const glanceStats = $$('.glance-stat strong');
  if (glanceStats[0]) glanceStats[0].textContent = stats.weekWorkouts.length;
  if (glanceStats[1]) glanceStats[1].textContent = stats.averageSteps === null ? '—' : `${(stats.averageSteps / 1000).toFixed(1)}k`;
  const workoutCards = $$('.page-workout .metric-card');
  if (workoutCards.length >= 3) {
    workoutCards[0].querySelector('strong').innerHTML = `${stats.weekWorkouts.length}<span>/${stats.trainingTarget}</span>`;
    workoutCards[0].querySelector('p').textContent = 'sessions completed';
    workoutCards[0].querySelector('.metric-progress i').style.width = `${Math.min(100, Math.round((stats.weekWorkouts.length / stats.trainingTarget) * 100))}%`;
    workoutCards[1].querySelector('strong').innerHTML = `${stats.streak} <small>days</small>`;
    workoutCards[1].querySelector('p').textContent = 'live workout streak';
    const minutes = Math.floor(stats.activeSeconds / 60);
    workoutCards[2].querySelector('strong').innerHTML = `${Math.floor(minutes / 60)}h <span>${String(minutes % 60).padStart(2, '0')}m</span>`;
    workoutCards[2].querySelector('p').textContent = 'tracked movement time';
  }
  const heroScore = $('.progress-hero-card h2');
  if (heroScore) heroScore.innerHTML = `${stats.weeklyScore}<span>/100</span>`;
  const heroNote = $('.progress-hero-card p');
  if (heroNote) heroNote.textContent = `${stats.weekWorkouts.length} workouts, ${stats.weekMeals.length} meals, and ${state.progressLogs.filter((log) => inRecentDays(log.date, 7)).length} check-ins logged in the last 7 days.`;
  const heroRing = $('.hero-score-value');
  if (heroRing) heroRing.style.strokeDashoffset = `${258 - (258 * stats.weeklyScore / 100)}`;
  const smallCards = $$('.page-progress .progress-small-card');
  if (smallCards[0]) { smallCards[0].querySelector('strong').textContent = stats.monthWorkouts.length; smallCards[0].querySelector('p').textContent = 'completed in the last 30 days'; smallCards[0].querySelector('.progress-icon-line span').textContent = `${stats.weekWorkouts.length} this week`; }
  if (smallCards[1]) { smallCards[1].querySelector('strong').textContent = stats.monthMeals.length; smallCards[1].querySelector('p').textContent = 'logged in the last 30 days'; smallCards[1].querySelector('.progress-icon-line span').textContent = `${stats.weekMeals.length} this week`; }
  const consistencyTrend = $('.consistency-card .trend-up');
  if (consistencyTrend) consistencyTrend.textContent = `${Math.round((stats.weekWorkouts.length / stats.trainingTarget) * 100)}% target`;
  $$('.large-bars span').forEach((bar, index) => { const day = daysFromToday(index - 11); const key = dateKey(day); const daily = [...stats.dailyBars, ...Array.from({ length: 5 }, (_, extra) => ({ key: dateKey(daysFromToday(extra - 11)), value: 0 }))].find((item) => item.key === key); bar.style.height = `${Math.max(4, daily?.value || 0)}%`; bar.classList.toggle('large-bar-active', key === dateKey()); const label = bar.querySelector('b'); if (label) label.textContent = daily?.value ? Math.round(daily.value / 10) : '0'; });
  const wins = $$('.wins-card .win-row');
  if (wins.length >= 3) {
    wins[0].querySelector('strong').textContent = stats.weekMeals.length ? `Logged ${stats.weekMeals.length} meals this week` : 'No meals logged this week yet';
    wins[0].querySelector('small').textContent = stats.weekMeals.length ? 'Live from meal ticks' : 'Tick a meal when you eat it';
    wins[1].querySelector('strong').textContent = stats.weekWorkouts.length ? `Finished ${stats.weekWorkouts.length} workout${stats.weekWorkouts.length === 1 ? '' : 's'} this week` : 'No completed workouts yet';
    wins[1].querySelector('small').textContent = stats.weekWorkouts.length ? 'Live from workout completion' : 'Start and finish a session';
    wins[2].querySelector('strong').textContent = stats.averageSteps === null ? 'Add steps to your check-in' : `Average ${stats.averageSteps.toLocaleString('en-IN')} steps`;
    wins[2].querySelector('small').textContent = stats.averageSteps === null ? 'Use Progress to add real data' : 'Live from recent check-ins';
  }
}

function dayDate(day) {
  const now = new Date();
  const monday = new Date(now);
  const offset = (now.getDay() + 6) % 7;
  monday.setHours(12, 0, 0, 0);
  monday.setDate(now.getDate() - offset + dayNames.indexOf(day));
  return monday;
}
function dateLabel(date) { return new Intl.DateTimeFormat('en-IN', { month: 'long', day: 'numeric', year: 'numeric' }).format(date); }
function updateLiveHeader() {
  const now = new Date();
  $('.breadcrumb span').textContent = activeDay;
  $('.breadcrumb strong').textContent = dateLabel(dayDate(activeDay));
  $('.live-clock').textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

const viewCopy = {
  overview: { title: 'Your plan, <em>made for you.</em>', subtitle: 'A little movement, food that feels like home, and a plan that fits around your lectures.' },
  workout: { title: 'Your next <em>move starts here.</em>', subtitle: 'Short, useful sessions that fit around classes, commutes, and the energy you actually have today.' },
  meals: { title: 'Fuel that <em>fits your day.</em>', subtitle: 'Easy, budget-aware meals built around the ingredients and food traditions you already know.' },
  progress: { title: 'Small wins, <em>stacked up.</em>', subtitle: 'See the rhythm behind your week and keep building habits that last beyond the semester.' },
  profile: { title: 'Your <em>profile.</em>', subtitle: 'Keep your body details, health context, and training preferences up to date.' },
  privacy: { title: 'Privacy <em>policy.</em>', subtitle: 'A clear guide to how your account data is used.' }
};
function switchView(view) {
  const copy = viewCopy[view] || viewCopy.overview;
  $$('.nav-item, .mobile-nav button').forEach((button) => button.classList.toggle('is-active', button.dataset.view === view));
  $$('.page-panel').forEach((panel) => panel.classList.toggle('is-visible', panel.dataset.page === view));
  if (view === 'overview') {
    $('#welcome-heading').innerHTML = copy.title;
    $('.welcome-subtitle').textContent = copy.subtitle;
  }
  document.body.dataset.view = view;
  trackEvent('view_opened', { view });
  if (view === 'profile') document.title = 'Fitly — Profile';
  document.title = `Fitly — ${view === 'overview' ? 'Your plan, made for you' : view === 'workout' ? 'My workouts' : view === 'meals' ? 'Meal plans' : 'Progress'}`;
  document.title = `Fitly — ${{ overview: 'Your plan, made for you', workout: 'My workouts', meals: 'Meal plans', progress: 'Progress', profile: 'Profile', privacy: 'Privacy policy' }[view] || 'Your plan'}`;
  if (view !== 'overview') showToast(`${view[0].toUpperCase()}${view.slice(1)} view selected`);
}
$$('[data-view]').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.view)));
$('.topbar-avatar')?.addEventListener('click', (event) => {
  event.stopPropagation();
  if (window.innerWidth <= 768) {
    const menu = $('.account-menu');
    if (menu?.hidden) openAccountMenu(); else closeAccountMenu();
  } else {
    closeAccountMenu();
    switchView('profile');
    populateProfilePage();
  }
});

function normalizePlan(plan, day = activeDay) {
  const workout = plan?.workout || fallbackWorkouts[day] || fallbackWorkouts.Tuesday;
  const mealSource = plan?.meals?.length ? plan.meals : getLocalMeals(state.preferences.food, state.profile?.diet || 'omnivore', day);
  const profile = plan?.profile || state.profile || null;
  return { workout, week: plan?.week || [], meals: mealSource, nutrition: plan?.nutrition || calculateNutrition(profile), adaptation: plan?.adaptation || analyzeProgress(state.progressLogs, profile), profile, date: plan?.date || { day }, mealRotationVersion: Number(plan?.mealRotationVersion) || 0, source: plan?.source || 'local' };
}
const activityFactors = { sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725, extreme: 1.9 };
function getLocalMeals(food = state.preferences.food, diet = state.profile?.diet || 'omnivore', day = activeDay, variation = 0) {
  const dayIndex = (Math.max(0, dayNames.indexOf(day)) + Math.max(0, Math.floor(Number(variation) || 0))) % 7;
  const variants = fallbackMealVariants[food] || fallbackMealVariants['South Indian'];
  return (fallbackMeals[food] || fallbackMeals['South Indian']).map(([meal, title, ingredients, kcal], index) => {
    const variant = variants?.[meal]?.[dayIndex] || [title, ingredients];
    const selectedTitle = variant[0];
    const selectedIngredients = variant[1];
    if (diet === 'vegan') return { meal, title: selectedTitle.replace(/boiled eggs|eggs|paneer|curd|yogurt|cheese/gi, (item) => item.toLowerCase().includes('paneer') || item.toLowerCase().includes('egg') ? 'tofu' : 'coconut yogurt'), ingredients: selectedIngredients.replace(/eggs|paneer|curd|yogurt|cheese/gi, (item) => item.toLowerCase().includes('paneer') || item.toLowerCase().includes('egg') ? 'tofu' : 'coconut yogurt'), kcal, done: index < 2 };
    if (diet === 'vegetarian') return { meal, title: selectedTitle.replace(/boiled eggs|eggs/gi, 'tofu scramble'), ingredients: selectedIngredients.replace(/eggs/gi, 'tofu'), kcal, done: index < 2 };
    return { meal, title: selectedTitle, ingredients: selectedIngredients, kcal, done: index < 2 };
  });
}
function calculateNutrition(profile) {
  profile = profile || {};
  const age = Number(profile.age);
  const weight = Number(profile.weight);
  const height = Number(profile.height);
  if (!age || !weight || !height) return null;
  const sexAdjustment = profile.sex === 'male' ? 5 : profile.sex === 'female' ? -161 : -78;
  const bmr = 10 * weight + 6.25 * height - 5 * age + sexAdjustment;
  const activityFactor = activityFactors[profile.activity] || activityFactors.moderate;
  const tdee = bmr * activityFactor;
  const goal = profile.goal || 'Strength training';
  const multiplier = goal === 'Bulking' ? 1.1 : goal === 'Fat loss' ? 0.85 : 1;
  const targetCalories = Math.round(tdee * multiplier);
  const proteinRange = goal === 'Fat loss' ? [1.8, 2.4] : [1.6, 2.2];
  const protein = { min: Math.round(weight * proteinRange[0]), max: Math.round(weight * proteinRange[1]) };
  protein.target = Math.round((protein.min + protein.max) / 2);
  const fat = { min: Math.round(weight * 0.6), max: Math.round(weight), target: Math.round(weight * 0.8) };
  const carbs = { target: Math.max(0, Math.round((targetCalories - protein.target * 4 - fat.target * 9) / 4)) };
  const fiber = { target: Math.round(targetCalories * 14 / 1000) };
  const weightTrend = goal === 'Bulking' ? { direction: 'gain', min: +(weight * 0.001).toFixed(2), max: +(weight * 0.0025).toFixed(2), unit: 'kg/week' } : goal === 'Fat loss' ? { direction: 'loss', min: +(weight * 0.005).toFixed(2), max: +(weight * 0.01).toFixed(2), unit: 'kg/week' } : { direction: 'maintain', min: 0, max: 0, unit: 'kg/week' };
  const heightMeters = height / 100;
  const bmi = +(weight / (heightMeters * heightMeters)).toFixed(1);
  const leanMass = profile.bodyFat ? +(weight * (1 - Number(profile.bodyFat) / 100)).toFixed(1) : null;
  const fatMass = leanMass === null ? null : +(weight - leanMass).toFixed(1);
  const targetBodyFat = Number(profile.targetBodyFat) || (goal === 'Fat loss' && Number(profile.bodyFat) ? Math.max(10, Number(profile.bodyFat) - 5) : null);
  const goalWeight = leanMass !== null && targetBodyFat && targetBodyFat < 100 ? +(leanMass / (1 - targetBodyFat / 100)).toFixed(1) : null;
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), activityFactor, targetCalories, goal, maintenanceCalories: Math.round(tdee), bulkCalories: { min: Math.round(tdee * 1.05), target: Math.round(tdee * 1.1), max: Math.round(tdee * 1.15) }, cutCalories: { min: Math.round(tdee * 0.75), target: Math.round(tdee * 0.85), max: Math.round(tdee * 0.9) }, recompCalories: Math.round(tdee), protein, fat, carbs, fiber, proteinPerMeal: { min: Math.round(weight * 0.3), max: Math.round(weight * 0.5) }, weightTrend, bmi, leanMass, fatMass, targetBodyFat, goalWeight, estimateNote: 'Starting estimate. Recheck your 7-day average after 2–3 weeks before adjusting by 100–200 kcal.' };
}
function averageValues(values) {
  const usable = values.filter((value) => Number.isFinite(value));
  return usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : null;
}
function analyzeProgress(logs = state.progressLogs || [], profile = state.profile || {}) {
  const nutrition = calculateNutrition(profile);
  const sorted = [...logs].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  const weightLogs = sorted.filter((log) => Number.isFinite(Number(log.weight)));
  const recentAverage = averageValues(weightLogs.slice(-7).map((log) => Number(log.weight)));
  const previousAverage = averageValues(weightLogs.slice(-14, -7).map((log) => Number(log.weight)));
  const weeklyChange = recentAverage !== null && previousAverage !== null ? +(recentAverage - previousAverage).toFixed(2) : null;
  const target = nutrition?.weightTrend;
  let action = 'hold';
  let headline = 'Keep collecting your baseline.';
  let message = 'Log consistent weigh-ins and recovery check-ins so Fitly can adapt from trends instead of one-off numbers.';
  if (weeklyChange !== null && target) {
    const absoluteChange = Math.abs(weeklyChange);
    const tooSlow = target.direction === 'gain' ? weeklyChange < target.min * 0.7 : target.direction === 'loss' ? weeklyChange > -target.min * 0.7 : absoluteChange > 0.2;
    const tooFast = target.direction === 'gain' ? weeklyChange > target.max * 1.3 : target.direction === 'loss' ? weeklyChange < -target.max * 1.3 : false;
    if (tooSlow) { action = target.direction === 'loss' ? 'increase_activity_or_reduce' : 'increase_calories'; headline = target.direction === 'loss' ? 'The loss trend is slower than target.' : 'The gain trend is slower than target.'; message = target.direction === 'loss' ? 'If the 14-day trend stays flat, consider 100–200 fewer kcal or a small step increase.' : 'If the 14-day trend stays flat, consider adding about 100–200 kcal/day.'; }
    else if (tooFast) { action = target.direction === 'loss' ? 'increase_calories' : 'reduce_calories'; headline = target.direction === 'loss' ? 'The loss trend is faster than target.' : 'The gain trend is faster than target.'; message = target.direction === 'loss' ? 'Consider adding 100–200 kcal/day and review recovery.' : 'Consider reducing about 100–200 kcal/day to keep the gain controlled.'; }
    else { headline = 'Your weight trend is in range.'; message = 'Keep calories, steps, and training steady. The trend is more useful than any single weigh-in.'; }
  }
  const latest = sorted.at(-1) || null;
  profile = profile || {};
  const sleepHours = Number(latest?.sleepHours ?? profile.sleepHours);
  const fatigue = Number(latest?.fatigue ?? profile.fatigue);
  const soreness = Number(latest?.soreness ?? profile.soreness);
  const recoveryState = (Number.isFinite(sleepHours) && sleepHours < 6.5) || (Number.isFinite(fatigue) && fatigue >= 4) || (Number.isFinite(soreness) && soreness >= 4) ? 'reduce' : 'train';
  return { entries: sorted.length, recentAverage: recentAverage === null ? null : +recentAverage.toFixed(1), previousAverage: previousAverage === null ? null : +previousAverage.toFixed(1), weeklyChange, action, headline, message, recoveryState, recoveryMessage: recoveryState === 'reduce' ? 'Recovery looks limited today. Reduce volume, keep technique crisp, or choose a recovery session.' : 'Recovery signals look ready for your planned session.', latest, nutrition };
}
function localSummaryPlan(day, variation = 0) {
  const workout = { ...(fallbackWorkouts[day] || fallbackWorkouts.Tuesday) };
  const goal = state.profile?.goal || state.preferences.goal;
  if (goal === 'Bulking') {
    workout.title = 'Progressive power';
    workout.type = 'STRENGTH • CONTROLLED';
    workout.description = 'A progressive strength session that gives you enough stimulus to build without taking over your whole day.';
    workout.meta = ['07', '4', '175'];
  } else if (goal === 'Fat loss') {
    workout.title = 'Lean & steady';
    workout.type = 'FULL BODY • LOW IMPACT';
    workout.description = 'A steady full-body session with simple movements and enough recovery to keep your energy useful.';
    workout.meta = ['06', '3', '140'];
  } else if (goal === 'Strength training' || state.preferences.goal === 'Build strength') {
    workout.title = 'Strength foundations';
    workout.type = 'STRENGTH • AT HOME';
    workout.description = 'Build a reliable strength base with controlled reps, simple progressions, and no complicated setup.';
    workout.meta = ['06', '3', '130'];
  } else if (state.preferences.goal === 'Get more energy') {
    workout.title = day === 'Sunday' ? 'Walk & reset' : 'Energy lift';
    workout.type = 'LOW IMPACT • ENERGY';
    workout.description = 'A bright, low-impact session designed to leave you more alert for classes, not wiped out.';
  } else if (state.preferences.goal === 'Feel more flexible') {
    workout.title = 'Open & unwind';
    workout.type = 'MOBILITY • AT HOME';
    workout.description = 'A slower mobility flow for shoulders, hips, and the stiffness that comes with long study sessions.';
    workout.meta = ['05', '2', '75'];
  }
  const adaptation = analyzeProgress(state.progressLogs, state.profile);
  if (adaptation.recoveryState === 'reduce') {
    workout.title = 'Recovery reset';
    workout.type = 'RECOVERY • LOW IMPACT';
    workout.description = 'A lighter session for a lower-energy day: mobility, breathing, and controlled movement without chasing fatigue.';
    workout.meta = ['04', '2', '65'];
  } else if (Number(state.profile?.sessionMinutes) && Number(state.profile.sessionMinutes) <= 20) {
    workout.description = `${workout.description} A focused ${state.profile.sessionMinutes}-minute version keeps the essentials.`;
    workout.meta = ['04', '3', '90'];
  }
  if (state.preferences.equipment === 'Gym access') workout.type = workout.type.replace('AT HOME', 'GYM OPTIONAL');
  return normalizePlan({ workout, meals: getLocalMeals(state.preferences.food, state.profile?.diet || 'omnivore', day, variation), profile: state.profile, nutrition: calculateNutrition(state.profile) }, day);
}
function localPlan(day, variation = 0) {
  const engine = window.FitlyWorkoutEngine;
  if (!engine) return localSummaryPlan(day, variation);
  const profile = { ...(state.profile || {}), goal: state.profile?.goal || 'Strength training', equipment: state.profile?.equipment || state.preferences.equipment };
  const adaptation = analyzeProgress(state.progressLogs, profile);
  const week = engine.buildWeek(profile, state.preferences, adaptation);
  const currentEntry = week.find((entry) => entry.day === day);
  const alternateSplits = {
    'Full body A': ['Full body B', 'Upper A', 'Push'],
    'Full body B': ['Full body A', 'Lower A', 'Pull'],
    'Upper A': ['Upper B', 'Push', 'Full body A'],
    'Upper B': ['Upper A', 'Pull', 'Full body B'],
    'Lower A': ['Lower B', 'Legs', 'Full body A'],
    'Lower B': ['Lower A', 'Legs B', 'Full body B'],
    Push: ['Push B', 'Upper A', 'Full body A'],
    Pull: ['Pull B', 'Upper B', 'Full body B'],
    Legs: ['Legs B', 'Lower A', 'Full body A']
  };
  const regeneration = Math.max(0, Math.floor(Number(variation) || 0));
  const alternateSplit = regeneration && currentEntry?.isTraining ? alternateSplits[currentEntry.split]?.[(regeneration - 1) % alternateSplits[currentEntry.split].length] : null;
  let workout = alternateSplit ? engine.buildWorkout(day, alternateSplit, profile, state.preferences, adaptation) : currentEntry?.workout || engine.buildWorkout(day, 'Full body A', profile, state.preferences, adaptation);
  if (!alternateSplit && regeneration && currentEntry && !currentEntry.isTraining) {
    const recoveryVariants = [
      { title: 'Mobility reset', type: 'RECOVERY - MOBILITY', description: 'A gentle mobility sequence to loosen your hips, shoulders, and back without adding fatigue.', names: ['Gentle walk & breathing', 'Cat-cow flow', 'Open-book rotation', 'Long-exhale reset'] },
      { title: 'Walk & restore', type: 'RECOVERY - EASY MOVEMENT', description: 'A relaxed walk and mobility session to support circulation, energy, and tomorrow’s training.', names: ['Easy walk', '90/90 hip switches', 'Wall angels', 'Box breathing'] },
      { title: 'Stretch & reset', type: 'RECOVERY - FLEXIBILITY', description: 'A calm full-body reset for a busy day. Keep every movement comfortable and conversational.', names: ['Easy march', 'Half-kneeling hip stretch', 'Thread-the-needle', 'Relaxed breathing'] }
    ][(regeneration - 1) % 3];
    workout = { ...workout, ...recoveryVariants, meta: ['04', '2', '65'], exercises: workout.exercises.map((item, index) => ({ ...item, name: recoveryVariants.names[index] || item.name })) };
  }
  if ((alternateSplit || regeneration) && currentEntry) { currentEntry.split = alternateSplit || currentEntry.split; currentEntry.title = workout.title; currentEntry.type = workout.type; currentEntry.focus = workout.focus; currentEntry.duration = workout.duration; currentEntry.workout = workout; }
  return normalizePlan({ workout, week, meals: getLocalMeals(state.preferences.food, state.profile?.diet || 'omnivore', day, regeneration), profile, nutrition: calculateNutrition(profile), adaptation }, day);
}
let planGenerationVersion = 0;
async function fetchPlan(day, force = false) {
  const requestId = ++planRequestId;
  const variation = force ? ++planGenerationVersion : 0;
  const cached = state.plans?.[day];
  if (cached && !force && cached.mealRotationVersion === 2 && cached.workout?.exercises?.length && cached.week?.length) return normalizePlan(cached, day);
  try {
    const response = await fetch('/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: dayDate(day).toISOString(), preferences: state.preferences, profile: state.profile, progressLogs: state.progressLogs, variation }) });
    if (!response.ok) throw new Error(`Plan request failed (${response.status})`);
    const result = await response.json();
    if (requestId !== planRequestId || activeDay !== day) return null;
    const plan = normalizePlan(result.plan, day);
    trackEvent('plan_loaded', { day, source: result.plan?.source || 'server' });
    return plan;
  } catch (error) {
    if (requestId !== planRequestId || activeDay !== day) return null;
    console.info('[fitly] Using local plan fallback:', error.message);
    return localPlan(day, variation);
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}
function exerciseCompletionKey(day, exercise, index) {
  return `${day}:${index}:${String(exercise?.name || 'exercise').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}
function renderWorkoutDetails() {
  const workout = activePlan?.workout;
  if (!workout) return;
  const setText = (selector, value, fallback = '-') => { const element = $(selector); if (element) element.textContent = value || fallback; };
  setText('.detail-focus', workout.focus);
  setText('.detail-split', workout.split);
  setText('.detail-duration', workout.duration ? `${workout.duration} min` : `${state.profile?.sessionMinutes || 30} min`);
  setText('.detail-equipment', workout.equipment);
  setText('.detail-recovery-note', workout.recovery?.note || activePlan.adaptation?.recoveryMessage || 'Use controlled reps and stop if you feel pain, dizziness, or unusual symptoms.');
  setText('.detail-warmup-general', workout.warmup?.general);
  setText('.detail-warmup-specific', workout.warmup?.specific);
  const cooldown = $('.detail-cooldown');
  if (cooldown) cooldown.innerHTML = (workout.cooldown || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  setText('.detail-progression-method', workout.progression?.method);
  setText('.detail-progression-rule', workout.progression?.rule);
  setText('.detail-progression-next', workout.progression?.nextSession);
  setText('.detail-tracking', Array.isArray(workout.tracking) ? workout.tracking.join(' • ') : '-');
  setText('.detail-volume', workout.weeklyVolume && Object.keys(workout.weeklyVolume).length ? Object.entries(workout.weeklyVolume).map(([muscle, sets]) => `${muscle}: ${sets} sets`).join(' • ') : 'Recovery / mobility day');
  const badge = $('.workout-plan-badge');
  if (badge) badge.textContent = activePlan.source === 'gemini' ? 'AI + FITLY ENGINE' : 'FITLY ADAPTIVE';
  const list = $('#exercise-detail-list');
  if (!list) return;
  list.innerHTML = (workout.exercises || []).map((item, index) => `<article class="exercise-detail-item">
    <div class="exercise-detail-top"><span class="exercise-detail-number">${String(index + 1).padStart(2, '0')}</span><div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.primary || 'Full body')} <span>•</span> ${escapeHtml(item.pattern || item.secondary || 'Controlled movement')}</p></div><span class="exercise-kind">${escapeHtml(item.category || 'compound')}</span></div>
    <div class="exercise-stat-grid"><div><span>SETS × REPS</span><strong>${escapeHtml(item.sets)} × ${escapeHtml(item.reps)}</strong></div><div><span>EFFORT</span><strong>${escapeHtml(item.rir || '2 RIR')}</strong></div><div><span>REST</span><strong>${escapeHtml(item.rest || '90 sec')}</strong></div><div><span>EQUIPMENT</span><strong>${escapeHtml(item.equipment || 'Bodyweight')}</strong></div></div>
    <div class="exercise-detail-notes"><p><b>How:</b> ${escapeHtml(item.technique)}</p><p><b>Watch:</b> ${escapeHtml(item.commonMistakes)}</p></div>
    <div class="exercise-detail-footer"><span><b>Progress:</b> ${escapeHtml(item.progressionMethod || 'Add reps before load')}</span><span><b>Swap:</b> ${escapeHtml((item.substitutions || []).slice(0, 2).join(', ') || item.regression || 'Ask Fitly')}</span></div>
  </article>`).join('') || '<p class="empty-detail">This is a recovery day. Keep movement easy and pain-free.</p>';
}
function decorateExerciseCompletion() {
  const list = $('#exercise-detail-list');
  const exercises = activePlan?.workout?.exercises || [];
  if (!list) return;
  $$('.exercise-detail-item', list).forEach((card, index) => {
    const exercise = exercises[index];
    if (!exercise) return;
    const key = exerciseCompletionKey(activeDay, exercise, index);
    const done = Boolean(state.exerciseCompletion[key]?.completedAt);
    const workoutCompleted = Boolean(state.workouts[activeDay]?.completedAt);
    card.classList.toggle('is-complete', done);
    const kind = card.querySelector('.exercise-kind');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `exercise-complete ${done ? 'is-complete' : ''}`;
    button.dataset.exerciseIndex = String(index);
    button.setAttribute('aria-pressed', String(done));
    button.setAttribute('aria-label', done ? `Mark ${exercise.name} incomplete` : `Mark ${exercise.name} complete`);
    button.disabled = workoutCompleted;
    button.innerHTML = '<svg class="icon"><use href="#icon-check"/></svg>';
    kind?.after(button);
  });
}
function renderExercisePreview() {
  const list = $('.exercise-preview .exercise-list');
  const button = $('.exercise-preview .circle-arrow');
  const exercises = activePlan?.workout?.exercises || [];
  if (!list) return;
  list.innerHTML = exercises.map((exercise, index) => `<div><span class="exercise-num">${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(exercise.name)}</strong><span class="exercise-time">${escapeHtml(exercise.sets)} × ${escapeHtml(exercise.reps)}</span></div>`).join('');
  list.onscroll = () => updateExercisePreviewArrow(list, button);
  if (button) {
    button.hidden = list.scrollWidth <= list.clientWidth + 2;
    button.setAttribute('aria-label', 'Scroll to more exercises');
    updateExercisePreviewArrow(list, button);
  }
}
function updateExercisePreviewArrow(list = $('.exercise-preview .exercise-list'), button = $('.exercise-preview .circle-arrow')) {
  if (!list || !button) return;
  const atEnd = list.scrollLeft + list.clientWidth >= list.scrollWidth - 4;
  button.classList.toggle('is-return', atEnd && list.scrollWidth > list.clientWidth + 2);
  button.setAttribute('aria-label', atEnd ? 'Scroll back to the first exercises' : 'Scroll to more exercises');
}
function renderWorkoutLibrary() {
  const list = $('.workout-library-list');
  if (!list) return;
  if (workoutLibraryMode === 'month') {
    const today = startOfDay();
    const monthlyPlans = buildMonthlyWorkoutPlans(state.profile || {}, state.preferences, state.progressAnalysis || analyzeProgress(state.progressLogs, state.profile || {}));
    let lastMonth = -1;
    list.innerHTML = monthlyPlans.map((entry, index) => {
      const entryDate = startOfDay(entry.date);
      const dateKeyValue = dateKey(entryDate);
      const isFuture = entryDate > today;
      const workoutLog = state.workouts[entry.day] || {};
      const isCompleted = !isFuture && Boolean(workoutLog.completedAt);
      const isToday = dateKeyValue === dateKey(today);
      const isSelected = entry.day === activeDay && isToday;
      const iconClass = ['blue-workout', 'coral-workout', 'mint-workout', 'yellow-workout'][index % 4];
      const status = isCompleted ? 'Completed' : isToday ? 'Today' : isFuture ? 'Locked' : entry.isTraining ? 'Planned' : 'Recovery';
      const completeClass = isCompleted ? ' is-complete' : '';
      const lockClass = isFuture ? ' is-locked' : '';
      const selectedClass = isSelected ? ' is-selected' : '';
      const entryMonth = entryDate.getMonth();
      const monthHeader = entryMonth !== lastMonth
        ? `<div class="library-month-heading">${entryDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</div>`
        : '';
      lastMonth = entryMonth;
      // Past and today = clickable button; future = non-interactive div
      if (isFuture) {
        return `${monthHeader}<div class="workout-library-row workout-month-row${completeClass}${lockClass}" data-day="${escapeHtml(entry.day)}" data-date="${escapeHtml(dateKeyValue)}"><span class="library-day">${escapeHtml(entry.day.slice(0, 3).toUpperCase())}<strong>${entryDate.getDate()}</strong></span><span class="library-workout-icon ${iconClass}"><svg class="icon"><use href="#icon-${entry.isTraining ? 'dumbbell' : 'leaf'}"/></svg></span><span class="library-copy"><strong>${escapeHtml(entry.workout.title)}</strong><small>${escapeHtml(entry.workout.focus || entry.split)} <i>•</i> ${escapeHtml(entry.workout.duration)} min <i>•</i> ${escapeHtml(entry.workout.type)}</small></span><span class="library-status">${status}</span></div>`;
      }
      return `${monthHeader}<button class="workout-library-row workout-month-row workout-select${completeClass}${selectedClass}" data-day="${escapeHtml(entry.day)}" data-date="${escapeHtml(dateKeyValue)}"><span class="library-day">${escapeHtml(entry.day.slice(0, 3).toUpperCase())}<strong>${entryDate.getDate()}</strong></span><span class="library-workout-icon ${iconClass}"><svg class="icon"><use href="#icon-${entry.isTraining ? 'dumbbell' : 'leaf'}"/></svg></span><span class="library-copy"><strong>${escapeHtml(entry.workout.title)}</strong><small>${escapeHtml(entry.workout.focus || entry.split)} <i>•</i> ${escapeHtml(entry.workout.duration)} min <i>•</i> ${escapeHtml(entry.workout.type)}</small></span><span class="library-status${isCompleted ? ' completed' : ''}">${status}</span><svg class="icon library-arrow"><use href="#icon-arrow"/></svg></button>`;
    }).join('');
    updateWorkoutLibraryToggle();
    lockWorkoutRows();
    return;
  }
  // Use plan week if available; otherwise build from engine/fallback so the list is never empty
  let week = activePlan?.week;
  if (!Array.isArray(week) || !week.length) {
    const engine = window.FitlyWorkoutEngine;
    const profile = state.profile || {};
    const adaptation = state.progressAnalysis || analyzeProgress(state.progressLogs, profile);
    week = engine
      ? engine.buildWeek(profile, state.preferences, adaptation)
      : dayNames.map((day) => ({ day, title: (fallbackWorkouts[day] || fallbackWorkouts.Tuesday).title, split: 'Full body', type: (fallbackWorkouts[day] || fallbackWorkouts.Tuesday).type, focus: '', duration: (fallbackWorkouts[day] || fallbackWorkouts.Tuesday).duration || 30, isTraining: day !== 'Sunday' }));
  }
  if (!week.length) { list.innerHTML = ''; lockWorkoutRows(); return; }
  const today = startOfDay();
  list.innerHTML = week.map((entry, index) => {
    const isToday = entry.day === activeDay;
    const entryDate = startOfDay(dayDate(entry.day));
    const isFuture = entryDate > today;
    const isStarted = Boolean(state.workouts[entry.day]?.startedAt);
    const isCompleted = Boolean(state.workouts[entry.day]?.completedAt);
    const iconClass = ['blue-workout', 'coral-workout', 'mint-workout', 'yellow-workout'][index % 4];
    const status = isCompleted ? 'Completed' : isStarted ? 'In progress' : isToday ? 'Today' : isFuture ? 'Locked' : entry.isTraining ? 'Planned' : 'Recovery';
    return `<button class="workout-library-row workout-select ${isToday ? 'is-selected' : ''} ${isCompleted ? 'is-complete' : ''} ${isFuture ? 'is-locked' : ''}" data-day="${escapeHtml(entry.day)}" data-workout="${escapeHtml(entry.title)}"${isFuture ? ' disabled title="Future days are not yet accessible"' : ''}><span class="library-day">${escapeHtml(entry.day.slice(0, 3).toUpperCase())}<strong>${dayDate(entry.day).getDate()}</strong></span><span class="library-workout-icon ${iconClass}"><svg class="icon"><use href="#icon-${entry.isTraining ? 'dumbbell' : 'leaf'}"/></svg></span><span class="library-copy"><strong>${escapeHtml(entry.title)}</strong><small>${escapeHtml(entry.focus || entry.split)} <i>•</i> ${escapeHtml(entry.duration)} min <i>•</i> ${escapeHtml(entry.type)}</small></span><span class="library-status ${isStarted || isCompleted ? 'completed' : ''}">${status}</span><svg class="icon library-arrow"><use href="#icon-arrow"/></svg></button>`;
  }).join('');
  lockWorkoutRows();
  updateWorkoutLibraryToggle();
}

function renderWorkout() {
  const workout = activePlan.workout;
  $('.type-tag').textContent = workout.type;
  $('.workout-info h3').textContent = workout.title;
  $('.workout-info p').textContent = workout.description;
  $$('.workout-meta b').forEach((item, index) => { item.textContent = workout.meta?.[index] || ['06', '3', '120'][index]; });
  renderExercisePreview();
  const duration = $('.duration-pill');
  if (duration && workout.duration) duration.innerHTML = `<svg class="icon"><use href="#icon-clock"/></svg> ${escapeHtml(workout.duration)} min`;
  const nextWorkout = $('.next-workout-card');
  if (nextWorkout) {
    nextWorkout.querySelector('.type-tag').textContent = `${activeDay.toUpperCase()} • ${workout.type}`;
    nextWorkout.querySelector('h2').textContent = workout.title;
    nextWorkout.querySelector('p').textContent = workout.description;
  }
  const workoutLog = state.workouts[activeDay] || {};
  const isCompleted = Boolean(workoutLog.completedAt);
  const isStarted = Boolean((workoutLog.startedAt || workoutLog.startedDate) && !isCompleted);
  const isPaused = isStarted && Boolean(workoutLog.pausedAt && !workoutLog.activeStartedAt);
  const exerciseStatus = workoutExerciseStatus(activeDay);
  $$('.start-workout').forEach((button) => {
    button.classList.toggle('is-started', isStarted);
    button.classList.toggle('is-paused', isPaused);
    button.classList.toggle('is-completed', isCompleted);
    button.disabled = isCompleted;
    if (isCompleted) {
      button.setAttribute('aria-label', 'Workout complete');
      button.innerHTML = '<svg class="icon"><use href="#icon-check"/></svg> Workout complete';
    } else if (isStarted && exerciseStatus.allComplete) {
      button.setAttribute('aria-label', 'Complete workout');
      button.innerHTML = '<svg class="icon"><use href="#icon-check"/></svg> Complete workout <span class="timer-count">00:00</span>';
    } else if (isPaused) {
      button.setAttribute('aria-label', 'Resume workout');
      button.innerHTML = '<svg class="icon"><use href="#icon-play"/></svg> Resume workout <span class="timer-count">00:00</span>';
    } else if (isStarted) {
      button.setAttribute('aria-label', 'Pause workout');
      button.innerHTML = '<svg class="icon"><use href="#icon-pause"/></svg> Pause workout <span class="timer-count">00:00</span>';
    } else {
      button.setAttribute('aria-label', 'Start workout');
      button.innerHTML = '<svg class="icon"><use href="#icon-play"/></svg> Start workout';
    }
  });
  renderWorkoutDetails();
  decorateExerciseCompletion();
  renderWorkoutLibrary();
  renderProgression();
  renderLiveProgress();
}

function renderProgression() {
  const result = $('.progression-result');
  if (!result) return;
  const last = state.trainingLogs?.at(-1);
  if (!last) { result.textContent = 'Your next-set recommendation will appear here.'; return; }
  const load = Number(last.load) || 0;
  const reps = Number(last.reps) || 0;
  const rpe = Number(last.rpe) || 10;
  if (reps >= 10 && rpe <= 8) result.textContent = `${last.exercise}: strong set. Next time try ${load ? `${(load * 1.025).toFixed(1)}–${(load * 1.05).toFixed(1)} kg` : 'a small load increase'} and keep 8–10 reps.`;
  else if (rpe <= 8) result.textContent = `${last.exercise}: keep the load and aim for ${reps + 1} reps next time before adding weight.`;
  else result.textContent = `${last.exercise}: keep the same load until the set feels closer to RPE 8. Technique first.`;
}

function normalizeManualFood(food = {}) {
  const mealTypes = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];
  const numberOrZero = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  };
  return {
    id: String(food.id || `food-${Date.now()}`).slice(0, 100),
    day: dayNames.includes(food.day) ? food.day : activeDay,
    date: food.date || dayDate(activeDay).toISOString(),
    meal: mealTypes.includes(food.meal) ? food.meal : 'Snack',
    name: String(food.name || 'Manual food').trim().slice(0, 120),
    kcal: Math.round(numberOrZero(food.kcal)),
    protein: Math.round(numberOrZero(food.protein)),
    carbs: Math.round(numberOrZero(food.carbs)),
    fat: Math.round(numberOrZero(food.fat))
  };
}
function manualFoodsForDay(day = activeDay) {
  const selectedDate = dateKey(dayDate(day));
  return (state.manualFoods || []).filter((food) => {
    const foodDate = dateKey(food.date);
    return foodDate ? foodDate === selectedDate : food.day === day;
  });
}

function groceryIngredientName(value) {
  const text = String(value || '').trim().toLowerCase();
  const rules = [
    [/\begg(s)?\b/, 'Eggs'],
    [/\boat(s)?\b/, 'Oats'],
    [/spinach|palak|greens?/, 'Spinach'],
    [/paneer|cottage cheese/, 'Paneer'],
    [/curd/, 'Curd'],
    [/yogurt|yoghurt/, 'Yogurt'],
    [/vegetable|veggie|poriyal|salad|tomato|onion|pepper|cucumber|carrot|broccoli/, 'Vegetables'],
    [/rice/, 'Rice'],
    [/millet/, 'Millet'],
    [/oat/, 'Oats'],
    [/sambar|dal|lentil/, 'Lentils'],
    [/chana|chickpea|rajma|bean/, 'Beans / chickpeas'],
    [/fruit|banana|apple|orange/, 'Fruit'],
    [/lime|lemon/, 'Lime / lemon'],
    [/chutney|coconut/, 'Coconut'],
    [/dosa|idli|uthappam|roti|chapati|bread/, 'Wholegrain staples'],
    [/peanut|nut|seed/, 'Peanuts & seeds'],
    [/oil|ghee/, 'Cooking oil']
  ];
  const match = rules.find(([pattern]) => pattern.test(text));
  return match ? match[1] : String(value || '').trim().replace(/\s+/g, ' ').replace(/^./, (character) => character.toUpperCase());
}
function groceryItemsForPlan() {
  const items = new Map();
  (activePlan?.meals || []).forEach((meal) => {
    String(meal.ingredients || '').split(/\s*[-•·]\s*/).map((item) => item.trim()).filter((item) => item.length > 1).forEach((item) => {
      const name = groceryIngredientName(item);
      const key = name.toLowerCase();
      if (!items.has(key)) items.set(key, { name, meal: meal.meal });
    });
  });
  (state.groceryManualItems || []).forEach((item) => {
    const name = String(item?.name || '').trim();
    const key = name.toLowerCase();
    if (name.length > 1 && !items.has(key)) items.set(key, { id: String(item.id || ''), name, meal: 'Added manually', manual: true });
  });
  return [...items.values()];
}
function groceryItemKey(name, day = activeDay) {
  return `${dateKey(dayDate(day))}:${name.toLowerCase()}`;
}
function renderGroceryList() {
  const list = $('#grocery-items');
  if (!list) return;
  const items = groceryItemsForPlan();
  state.groceryChecked = state.groceryChecked || {};
  const checkedCount = items.filter((item) => state.groceryChecked[groceryItemKey(item.name)]).length;
  const itemCount = $('#grocery-item-count');
  const checkedLabel = $('#grocery-checked-count');
  if (itemCount) itemCount.textContent = `${items.length} item${items.length === 1 ? '' : 's'}`;
  if (checkedLabel) checkedLabel.textContent = `${checkedCount} checked`;
  list.innerHTML = items.length ? items.map((item) => {
    const key = groceryItemKey(item.name);
    const checked = Boolean(state.groceryChecked[key]);
    return `<div class="grocery-item-row ${checked ? 'is-checked' : ''}"><button class="grocery-item-check ${checked ? 'is-checked' : ''}" type="button" data-grocery-key="${escapeHtml(key)}" data-grocery-name="${escapeHtml(item.name)}" data-grocery-meal="${escapeHtml(item.meal)}" aria-label="${checked ? 'Uncheck' : 'Check'} ${escapeHtml(item.name)}">${checked ? '<svg class="icon"><use href="#icon-check"/></svg>' : ''}</button><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.meal)}</small></span>${item.manual ? `<button class="grocery-item-remove" type="button" data-grocery-remove="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.name)}">×</button>` : ''}</div>`;
  }).join('') : '<p class="grocery-empty">Your current plan has no ingredients yet.</p>';
}
function openGroceryList() {
  const modal = $('.grocery-modal');
  if (!modal) return;
  renderGroceryList();
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
}
function closeGroceryList() {
  const modal = $('.grocery-modal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
}
function toggleGroceryItem(button) {
  const key = button.dataset.groceryKey;
  const name = button.dataset.groceryName;
  if (!key || !name) return;
  state.groceryChecked = { ...(state.groceryChecked || {}), [key]: !state.groceryChecked?.[key] };
  saveState();
  renderGroceryList();
  trackEvent('grocery_checked', { key, name, meal: button.dataset.groceryMeal || '', checked: Boolean(state.groceryChecked[key]) });
}
function normalizeGroceryItem(item = {}) {
  return { id: String(item.id || `grocery-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`).slice(0, 100), name: String(item.name || '').trim().slice(0, 100) };
}
async function addManualGroceryItem(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const input = form.elements.item;
  const item = normalizeGroceryItem({ name: input.value });
  if (!item.name) { input.focus(); return; }
  if ((state.groceryManualItems || []).some((existing) => existing.name.toLowerCase() === item.name.toLowerCase())) {
    showToast(`${item.name} is already on your grocery list`);
    input.focus();
    return;
  }
  state.groceryManualItems = [...(state.groceryManualItems || []), item].slice(-200);
  saveState();
  renderGroceryList();
  form.reset();
  const synced = await trackEvent('grocery_added', item);
  showToast(synced ? `${item.name} added and synced` : `${item.name} added to your grocery list`);
}
async function removeManualGroceryItem(id) {
  const item = (state.groceryManualItems || []).find((entry) => entry.id === id);
  if (!item) return;
  state.groceryManualItems = state.groceryManualItems.filter((entry) => entry.id !== id);
  saveState();
  renderGroceryList();
  const synced = await trackEvent('grocery_removed', item);
  showToast(synced ? `${item.name} removed and synced` : `${item.name} removed`);
}

function renderMeals() {
  const rows = $$('.meal-row');
  activePlan.meals.forEach((meal, index) => {
    const row = rows[index];
    if (!row) return;
    const done = Boolean(state.completedMeals[meal.meal]);
    row.dataset.meal = meal.meal;
    row.classList.toggle('is-done', done);
    row.querySelector('.meal-copy strong').textContent = meal.title;
    row.querySelector('.meal-copy small').textContent = meal.ingredients;
    row.querySelector('.meal-calories').textContent = `${meal.kcal} kcal`;
    const type = row.querySelector('.meal-type');
    type.textContent = meal.meal.toUpperCase();
    const time = document.createElement('b');
    time.textContent = mealTimes[index] || '';
    type.append(' ', time);
    const check = row.querySelector('.meal-check');
    check.classList.toggle('is-complete', done);
    check.innerHTML = done ? '<svg class="icon"><use href="#icon-check"/></svg>' : '';
    check.setAttribute('aria-label', done ? `Mark ${meal.meal.toLowerCase()} as incomplete` : `Mark ${meal.meal.toLowerCase()} as complete`);
  });
  renderMealPlanPage();
  updateCalories();
  renderLiveProgress();
}
function hydrateMealCompletionForDay(day = activeDay) {
  const selectedDate = dateKey(dayDate(day));
  const latest = new Map();
  (state.mealLogs || []).forEach((log) => {
    if (log?.meal && dateKey(log.date) === selectedDate) latest.set(log.meal, log);
  });
  state.completedMeals = { ...defaultState.completedMeals };
  latest.forEach((log, meal) => { state.completedMeals[meal] = Boolean(log.completed); });
}
function updateCalories() {
  const plannedCalories = activePlan.meals.reduce((total, meal) => total + (state.completedMeals[meal.meal] ? Number(meal.kcal || 0) : 0), 0);
  const manualCalories = manualFoodsForDay(activeDay).reduce((total, food) => total + Number(food.kcal || 0), 0);
  const doneCalories = plannedCalories + manualCalories;
  const nutrition = activePlan.nutrition;
  const target = nutrition?.targetCalories || 1850;
  const calorieSummary = $('.macro-row > div:first-child');
  if (calorieSummary) calorieSummary.innerHTML = `<span>${doneCalories.toLocaleString('en-IN')}</span> / ${target.toLocaleString('en-IN')} kcal`;
  $('.macro-track span').style.width = `${Math.min(100, (doneCalories / target) * 100)}%`;
  const breakdown = $$('.macro-breakdown span');
  if (nutrition && breakdown.length >= 3) {
    breakdown[0].innerHTML = `<i class="protein-dot"></i> ${nutrition.protein.target}g protein`;
    breakdown[1].innerHTML = `<i class="carbs-dot"></i> ${nutrition.carbs.target}g carbs`;
    breakdown[2].innerHTML = `<i class="fat-dot"></i> ${nutrition.fat.target}g fat`;
  }
  const nutritionHeading = $('.nutrition-score h2');
  if (nutritionHeading) nutritionHeading.innerHTML = `${doneCalories.toLocaleString('en-IN')} <span>/ ${target.toLocaleString('en-IN')} kcal</span>`;
  const nutritionNote = $('.nutrition-score p');
  if (nutritionNote && nutrition) nutritionNote.textContent = `${nutrition.goal}: aim for about ${nutrition.fiber.target}g fiber today. ${nutrition.estimateNote}`;
  const ringPercent = Math.min(100, Math.round((doneCalories / target) * 100));
  const ring = $('.nutrition-ring-value');
  if (ring) ring.style.strokeDashoffset = `${251 - (251 * ringPercent / 100)}`;
  const ringLabel = $('.nutrition-ring strong');
  if (ringLabel) ringLabel.innerHTML = `${ringPercent}<span>%</span>`;
  const macroRows = $$('.macro-summary-row');
  if (nutrition && macroRows.length >= 3) {
    const values = [[nutrition.protein.target, nutrition.protein.max], [nutrition.carbs.target, Math.max(nutrition.carbs.target, nutrition.targetCalories / 4)], [nutrition.fat.target, nutrition.fat.max]];
    macroRows.slice(0, 3).forEach((row, index) => {
      row.querySelector('strong').textContent = `${values[index][0]}g`;
      const bar = row.querySelector('i b');
      if (bar) bar.style.width = `${Math.min(100, Math.round((values[index][0] / values[index][1]) * 100))}%`;
    });
  }
}

function renderMealPlanPage() {
  const rows = $$('.plan-meal-row');
  if (!rows.length || !activePlan?.meals) return;
  $('.meal-plan-date').textContent = `${activeDay.toUpperCase()}, ${dateLabel(dayDate(activeDay)).toUpperCase()}`;
  const mealActions = $('.meal-prep-button')?.parentElement;
  if (mealActions) {
    mealActions.classList.add('meal-plan-actions');
    if (!$('.inline-add-food-button', mealActions)) {
      const button = document.createElement('button');
      button.className = 'dark-button inline-add-food-button';
      button.type = 'button';
      button.innerHTML = '<svg class="icon"><use href="#icon-plus"/></svg> Log what I ate';
      button.addEventListener('click', openFoodLog);
      mealActions.append(button);
    }
  }
  activePlan.meals.forEach((meal, index) => {
    const row = rows[index];
    if (!row) return;
    const check = row.querySelector('.page-meal-check');
    const done = Boolean(state.completedMeals[meal.meal]);
    row.querySelector('.plan-meal-time').textContent = mealTimes[index] || '';
    row.querySelector('.library-copy strong').textContent = meal.title;
    row.querySelector('.library-copy small').textContent = `${meal.meal} • ${meal.kcal} kcal`;
    check.dataset.meal = meal.meal;
    check.classList.toggle('is-complete', done);
    check.setAttribute('aria-label', done ? `${meal.meal} complete` : `${meal.meal} incomplete`);
    check.innerHTML = done ? '<svg class="icon"><use href="#icon-check"/></svg>' : '';
  });
  const mealList = $('.meal-plan-list');
  let manualList = $('#manual-food-list');
  if (mealList && !manualList) {
    manualList = document.createElement('div');
    manualList.className = 'manual-food-list manual-food-inline-list';
    manualList.id = 'manual-food-list';
    mealList.append(manualList);
  }
  const manualFoods = manualFoodsForDay(activeDay);
  if (manualList) {
    manualList.innerHTML = manualFoods.length ? manualFoods.map((food) => `
      <div class="plan-meal-row manual-food-row" data-food-id="${escapeHtml(food.id)}">
        <span class="plan-meal-time">${mealTimes[['Breakfast', 'Lunch', 'Snack', 'Dinner'].indexOf(food.meal)] || '—'}</span>
        <span class="meal-icon manual-food-icon ${food.meal.toLowerCase()}"><svg class="icon"><use href="#icon-check"/></svg></span>
        <span class="library-copy manual-food-copy">
          <strong>${escapeHtml(food.name)}</strong>
          <small>${escapeHtml(food.meal)} · ${food.kcal} kcal${food.protein || food.carbs || food.fat ? ` · ${food.protein}g protein · ${food.carbs}g carbs · ${food.fat}g fat` : ''}</small>
        </span>
        <button class="manual-food-remove" type="button" data-food-id="${escapeHtml(food.id)}" aria-label="Remove ${escapeHtml(food.name)}">×</button>
      </div>`).join('') : '';
  }
}

function renderProgressIntelligence(analysis = state.progressAnalysis || analyzeProgress(state.progressLogs, state.profile)) {
  state.progressAnalysis = analysis;
  const nutrition = activePlan?.nutrition || analysis?.nutrition || calculateNutrition(state.profile);
  if (nutrition) {
    $('.composition-bmi').textContent = nutrition.bmi ? nutrition.bmi.toFixed(1) : '—';
    $('.composition-lean').textContent = nutrition.leanMass ? `${nutrition.leanMass} kg` : '—';
    $('.composition-fat').textContent = nutrition.fatMass ? `${nutrition.fatMass} kg` : '—';
    $('.composition-goal').textContent = nutrition.goalWeight ? `${nutrition.goalWeight} kg` : '—';
    $('.composition-note').textContent = nutrition.goalWeight ? `At ${nutrition.targetBodyFat}% body fat, your estimated goal weight is ${nutrition.goalWeight} kg if lean mass stays stable.` : 'Add body-fat and target body-fat estimates in your profile to unlock goal-weight forecasting.';
    $('.today-target').textContent = `${nutrition.targetCalories.toLocaleString('en-IN')} kcal`;
  }
  const latest = analysis?.latest;
  $('.today-steps').textContent = latest?.steps || state.profile?.dailySteps ? `${Number(latest?.steps || state.profile.dailySteps).toLocaleString('en-IN')}` : '—';
  $('.today-sleep').textContent = latest?.sleepHours || state.profile?.sleepHours ? `${Number(latest?.sleepHours || state.profile.sleepHours).toFixed(1)}h` : '—';
  $('.today-recovery').textContent = analysis?.recoveryMessage || 'Log a check-in to personalize this';
  $('.adaptation-headline').textContent = analysis?.headline || 'Keep collecting your baseline.';
  $('.adaptation-message').textContent = analysis?.message || 'Log consistent weigh-ins and recovery check-ins so Fitly can adapt from trends instead of one-off numbers.';
  $('.adaptation-trend').textContent = analysis?.weeklyChange === null || analysis?.weeklyChange === undefined ? 'No trend yet' : `${analysis.weeklyChange > 0 ? '+' : ''}${analysis.weeklyChange} kg/week`;
  $('.recovery-state').textContent = analysis?.recoveryState === 'reduce' ? 'Reduce volume today' : 'Ready to train';
  $('.log-status').textContent = state.progressLogs?.length ? `${state.progressLogs.length} check-in${state.progressLogs.length === 1 ? '' : 's'} saved` : 'No check-ins yet';
  const progression = $('.progression-copy');
  if (progression && analysis?.recoveryState === 'reduce') progression.textContent = 'Recovery is limited today. Log your top set only if technique feels crisp, or choose a lighter session.';
  renderLiveProgress();
}
async function hydrateProgress() {
  try {
    const response = await fetch('/api/progress', { cache: 'no-store' });
    if (response.ok) {
      const result = await response.json();
      if (!state.progressLogs.length && Array.isArray(result.logs) && result.logs.length) state.progressLogs = result.logs;
    }
  } catch { /* The server remains the source of truth. */ }
  state.progressAnalysis = analyzeProgress(state.progressLogs, state.profile);
  saveState();
  renderProgressIntelligence(state.progressAnalysis);
}
async function hydrateTraining() {
  try {
    const response = await fetch('/api/training', { cache: 'no-store' });
    if (response.ok) {
      const result = await response.json();
      if (!state.trainingLogs.length && Array.isArray(result.logs) && result.logs.length) state.trainingLogs = result.logs;
    }
  } catch { /* The server remains the source of truth. */ }
  saveState();
  renderProgression();
}
async function syncActivity(log) {
  try {
    const response = await fetch('/api/activity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ log }) });
    if (!response.ok) throw new Error(`Activity sync failed (${response.status})`);
    return true;
  } catch (error) {
    console.info('[fitly] Activity could not sync:', error.message);
    return false;
  }
}
async function trackEvent(event, data = {}) {
  if (!state.user && !state.onboardingComplete) return false;
  const payload = data && typeof data === 'object' ? data : {};
  return syncActivity({ id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type: 'event', event, day: activeDay, date: new Date().toISOString(), data: { ...payload, view: document.body.dataset.view || 'overview' } });
}
document.addEventListener('click', (event) => {
  const target = event.target.closest('button, a, [role="button"], [role="tab"]');
  if (!target) return;
  const label = String(target.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100);
  trackEvent('ui_interaction', {
    element: target.dataset.action || target.dataset.view || target.className || target.tagName.toLowerCase(),
    label
  });
});
async function hydrateActivity() {
  try {
    const response = await fetch('/api/activity', { cache: 'no-store' });
    if (response.ok) {
      const result = await response.json();
      let latestSelectedDay = null;
      (result.logs || []).forEach((log) => {
        if (log.type === 'workout' && log.completed && log.day) state.workouts[log.day] = { ...(state.workouts[log.day] || {}), completedAt: log.date, durationSeconds: log.durationSeconds || 0 };
        if (log.type === 'meal' && log.meal && !state.mealLogs.some((item) => item.id === log.id)) state.mealLogs.push(log);
        if (log.type === 'event' && log.event === 'food_added' && log.data?.name) {
          const food = normalizeManualFood({ ...log.data, id: log.data.id || log.id, date: log.data.date || log.date });
          if (!state.manualFoods.some((item) => item.id === food.id)) state.manualFoods.push(food);
        }
        if (log.type === 'event' && log.event === 'food_removed' && log.data?.id) state.manualFoods = state.manualFoods.filter((item) => item.id !== String(log.data.id));
        if (log.type === 'event' && log.event === 'grocery_added' && log.data?.name) {
          const item = normalizeGroceryItem({ ...log.data, id: log.data.id || log.id });
          if (!state.groceryManualItems.some((existing) => existing.id === item.id)) state.groceryManualItems.push(item);
        }
        if (log.type === 'event' && log.event === 'grocery_removed' && log.data?.id) state.groceryManualItems = state.groceryManualItems.filter((item) => item.id !== String(log.data.id));
        if (log.type === 'event' && log.event === 'grocery_checked' && log.data?.key) state.groceryChecked[log.data.key] = Boolean(log.data.checked);
        if (log.type === 'exercise' && log.day && log.exercise && Number.isFinite(Number(log.index))) {
          const key = exerciseCompletionKey(log.day, { name: log.exercise }, Number(log.index));
          if (log.completed) state.exerciseCompletion[key] = { completedAt: log.date, exercise: log.exercise, day: log.day };
          else delete state.exerciseCompletion[key];
        }
        if (log.type === 'event' && log.event === 'workout_started' && log.day) {
          const startedAt = Number(log.data?.startedAt) || new Date(log.date).getTime();
          state.workouts[log.day] = { ...(state.workouts[log.day] || {}), startedAt, activeStartedAt: Number(log.data?.activeStartedAt) || startedAt, elapsedSeconds: Number(log.data?.elapsedSeconds) || 0, pausedAt: null, paused: false };
        }
        if (log.type === 'event' && log.event === 'workout_paused' && log.day) state.workouts[log.day] = { ...(state.workouts[log.day] || {}), elapsedSeconds: Number(log.data?.elapsedSeconds) || 0, activeStartedAt: null, pausedAt: log.data?.pausedAt || log.date, paused: true };
        if (log.type === 'event' && log.event === 'workout_resumed' && log.day) state.workouts[log.day] = { ...(state.workouts[log.day] || {}), activeStartedAt: Number(log.data?.activeStartedAt) || new Date(log.date).getTime(), pausedAt: null, paused: false };
        if (log.type === 'event' && log.event === 'day_selected' && dayNames.includes(log.data?.day)) latestSelectedDay = log.data.day;
        if (log.type === 'event' && log.event === 'plan_generated' && dayNames.includes(log.data?.day) && log.data?.plan) state.plans = { ...(state.plans || {}), [log.data.day]: log.data.plan };
      });
      if (latestSelectedDay) { activeDay = latestSelectedDay; state.selectedDay = latestSelectedDay; }
      state.mealLogs = state.mealLogs.slice(-500);
      state.manualFoods = state.manualFoods.slice(-300);
      state.groceryManualItems = state.groceryManualItems.slice(-200);
      hydrateMealCompletionForDay();
      saveState();
      renderWorkout();
      renderMeals();
      renderLiveProgress();
    }
  } catch { /* The server remains the source of truth. */ }
}
async function hydrateSignedInData() {
  await Promise.all([hydrateProgress(), hydrateTraining(), hydrateActivity()]);
  if (state.onboardingComplete && state.profile) await updateDay(activeDay, { quiet: true });
}
$('.progress-log-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const log = { id: `${Date.now()}`, date: new Date().toISOString() };
  ['weight', 'waist', 'bodyFat', 'calories', 'protein', 'steps', 'sleepHours', 'fatigue', 'soreness', 'stress'].forEach((key) => { const value = formData.get(key); if (value !== '') log[key] = Number(value); });
  state.progressLogs = [...(state.progressLogs || []), log].slice(-180);
  state.progressAnalysis = analyzeProgress(state.progressLogs, state.profile);
  saveState();
  let synced = false;
  try {
    const response = await fetch('/api/progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ log }) });
    if (response.ok) { const result = await response.json(); state.progressLogs = result.logs || state.progressLogs; state.progressAnalysis = result.analysis || state.progressAnalysis; synced = true; }
  } catch { /* Do not persist check-ins in the browser when offline. */ }
  saveState();
  renderProgressIntelligence(state.progressAnalysis);
  state.plans = {};
  await updateDay(activeDay, { force: true, quiet: true });
  event.currentTarget.reset();
  showToast(synced ? 'Check-in synced — your plan is adapting' : 'Could not sync check-in — reconnect and try again');
});
$('.measurement-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const log = { ...(state.progressLogs?.at(-1) || {}), id: `${Date.now()}`, date: new Date().toISOString() };
  ['chest', 'arms', 'legs', 'water'].forEach((key) => { const value = formData.get(key); if (value !== '') log[key] = Number(value); });
  state.progressLogs = [...(state.progressLogs || []), log].slice(-180);
  state.progressAnalysis = analyzeProgress(state.progressLogs, state.profile);
  saveState();
  try {
    const response = await fetch('/api/progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ log }) });
    if (response.ok) { const result = await response.json(); state.progressLogs = result.logs || state.progressLogs; state.progressAnalysis = result.analysis || state.progressAnalysis; saveState(); }
  } catch { /* Do not persist measurements in the browser when offline. */ }
  renderProgressIntelligence(state.progressAnalysis);
  event.currentTarget.reset();
  showToast('Measurements sent to your progress');
});

async function updateDay(day, { force = false, quiet = false } = {}) {
  activeDay = day;
  state.selectedDay = day;
  hydrateMealCompletionForDay(day);
  trackEvent('day_selected', { day, date: dayDate(day).toISOString() });
  saveState();
  $$('.day-tab').forEach((tab) => {
    const isActive = tab.dataset.day === day;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
    tab.querySelector('strong').textContent = dayDate(tab.dataset.day).getDate();
  });
  updateLiveHeader();
  activePlan = normalizePlan(localPlan(day), day);
  renderWorkout();
  renderMeals();
  renderWorkoutLibrary();
  const loadedPlan = await fetchPlan(day, force);
  if (!loadedPlan || activeDay !== day) return;
  activePlan = loadedPlan;
  state.plans = { ...(state.plans || {}), [day]: activePlan };
  saveState();
  renderWorkout();
  renderMeals();
  renderWorkoutLibrary();
  renderProgressIntelligence(activePlan.adaptation || analyzeProgress(state.progressLogs, state.profile));
  if (!quiet) showToast(`${day}'s plan is ready`);
}
function lockDayTabs() {
  const today = startOfDay();
  $$('.day-tab').forEach((tab) => {
    const tabDate = startOfDay(dayDate(tab.dataset.day));
    const isFuture = tabDate > today;
    tab.disabled = isFuture;
    tab.classList.toggle('is-locked', isFuture);
    tab.title = isFuture ? 'Future days are not yet accessible' : '';
  });
}
function lockWorkoutRows() {
  const today = startOfDay();
  const todayIndex = (new Date().getDay() + 6) % 7;
  const abbrevToIndex = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4, SAT: 5, SUN: 6 };
  $$('.workout-library-row').forEach((row) => {
    const rowDateAttr = row.dataset.date;
    let isFuture = false;
    if (rowDateAttr) {
      const rowDate = startOfDay(parseLocalDate(rowDateAttr));
      isFuture = rowDate > today;
    } else {
      const abbrev = row.querySelector('.library-day')?.firstChild?.textContent?.trim().toUpperCase();
      const rowIndex = abbrevToIndex[abbrev];
      if (rowIndex === undefined) return;
      isFuture = rowIndex > todayIndex;
    }
    row.disabled = isFuture;
    row.classList.toggle('is-locked', isFuture);
    row.title = isFuture ? 'Future days are not yet accessible' : '';
  });
}
lockDayTabs();
lockWorkoutRows();
$$('.day-tab').forEach((tab) => tab.addEventListener('click', () => {
  const today = startOfDay();
  const tabDate = startOfDay(dayDate(tab.dataset.day));
  if (tabDate > today) return; // block future days only
  updateDay(tab.dataset.day);
}));

function updateWorkoutTimer() {
  const workoutLog = state.workouts[activeDay] || {};
  const timers = $$('.timer-count');
  if (!workoutLog.startedAt || workoutLog.completedAt || !timers.length) return;
  const elapsed = workoutElapsedSeconds(workoutLog);
  const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const seconds = String(elapsed % 60).padStart(2, '0');
  timers.forEach((timer) => { timer.textContent = `${minutes}:${seconds}`; });
  renderLiveProgress();
}
$$('.start-workout').forEach((button) => button.addEventListener('click', () => {
  const current = state.workouts[activeDay] || {};
  if (current.completedAt) return;
  const now = Date.now();
  const status = workoutExerciseStatus(activeDay);
  const isStarted = Boolean(current.startedAt || current.startedDate);
  const isPaused = Boolean(current.pausedAt && !current.activeStartedAt);
  if (!isStarted) {
    state.workouts[activeDay] = { startedAt: now, activeStartedAt: now, elapsedSeconds: 0, startedDate: new Date(now).toISOString() };
    trackEvent('workout_started', { day: activeDay, startedAt: now, activeStartedAt: now, elapsedSeconds: 0 });
    showToast('Workout started — timer is running');
  } else if (status.allComplete) {
    const durationSeconds = workoutElapsedSeconds(current, now);
    const completedAt = new Date(now).toISOString();
    state.workouts[activeDay] = { ...current, completedAt, durationSeconds, elapsedSeconds: durationSeconds, activeStartedAt: null, pausedAt: null };
    syncActivity({ id: `workout-${activeDay}-${now}`, type: 'workout', day: activeDay, date: completedAt, completed: true, durationSeconds });
    showToast('Workout complete — all exercises are checked');
  } else if (isPaused) {
    state.workouts[activeDay] = { ...current, activeStartedAt: now, pausedAt: null, paused: false };
    trackEvent('workout_resumed', { day: activeDay, activeStartedAt: now, elapsedSeconds: workoutElapsedSeconds(current, now) });
    showToast('Workout resumed — timer is running');
  } else {
    const elapsedSeconds = workoutElapsedSeconds(current, now);
    state.workouts[activeDay] = { ...current, elapsedSeconds, activeStartedAt: null, pausedAt: new Date(now).toISOString(), paused: true };
    trackEvent('workout_paused', { day: activeDay, elapsedSeconds, pausedAt: state.workouts[activeDay].pausedAt });
    showToast('Workout paused — resume when you are ready');
  }
  saveState();
  renderWorkout();
  updateWorkoutTimer();
}));
$('#exercise-detail-list')?.addEventListener('click', (event) => {
  const button = event.target.closest('.exercise-complete');
  if (!button) return;
  const index = Number(button.dataset.exerciseIndex);
  const exercise = activePlan?.workout?.exercises?.[index];
  if (!exercise) return;
  const key = exerciseCompletionKey(activeDay, exercise, index);
  const completed = !state.exerciseCompletion[key]?.completedAt;
  const date = dayDate(activeDay).toISOString();
  if (completed) state.exerciseCompletion[key] = { completedAt: date, exercise: exercise.name, day: activeDay };
  else delete state.exerciseCompletion[key];
  syncActivity({ id: `exercise-${key}`, type: 'exercise', day: activeDay, exercise: exercise.name, index, date, completed });
  saveState();
  renderWorkout();
  showToast(completed ? `${exercise.name} complete — green tick saved` : `${exercise.name} marked incomplete`);
});
$('.progression-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const log = { exercise: String(formData.get('exercise') || 'Main movement'), load: Number(formData.get('load')), reps: Number(formData.get('reps')), rpe: Number(formData.get('rpe')), date: new Date().toISOString() };
  state.trainingLogs = [...(state.trainingLogs || []), log].slice(-60);
  saveState();
  renderProgression();
  fetch('/api/training', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ log }) }).then(async (response) => {
    if (!response.ok) return;
    const result = await response.json();
    if (Array.isArray(result.logs)) { state.trainingLogs = result.logs; saveState(); renderProgression(); }
  }).catch(() => { /* The server remains the source of truth. */ });
  showToast('Top set logged — Fitly updated your next step');
});

function toggleMealCompletion(meal) {
  const completed = !state.completedMeals[meal];
  state.completedMeals[meal] = completed;
  const mealLog = { id: `${Date.now()}-${meal}`, type: 'meal', meal, completed, date: dayDate(activeDay).toISOString(), kcal: Number(activePlan?.meals?.find((item) => item.meal === meal)?.kcal || 0) };
  state.mealLogs = [...(state.mealLogs || []), mealLog].slice(-500);
  syncActivity(mealLog);
  saveState();
  renderMeals();
  renderLiveProgress();
  showToast(completed ? `${meal} logged — green tick saved` : `${meal} removed from your log`);
}
$$('.meal-row').forEach((row) => row.querySelector('.meal-check').addEventListener('click', () => toggleMealCompletion(row.dataset.meal)));
$$('.page-meal-check').forEach((button) => button.addEventListener('click', () => toggleMealCompletion(button.dataset.meal)));

function openFoodLog() {
  const modal = $('.food-log-modal');
  if (!modal) return;
  const form = $('#food-log-form');
  if (form?.elements.meal) form.elements.meal.value = activeDay === 'Sunday' ? 'Dinner' : 'Snack';
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  form?.elements.name?.focus();
}
function closeFoodLog() {
  const modal = $('.food-log-modal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
}
async function saveManualFood(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const food = normalizeManualFood({
    id: `food-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    day: activeDay,
    date: dayDate(activeDay).toISOString(),
    meal: data.get('meal'),
    name: data.get('name'),
    kcal: data.get('kcal'),
    protein: data.get('protein'),
    carbs: data.get('carbs'),
    fat: data.get('fat')
  });
  state.manualFoods = [...(state.manualFoods || []), food].slice(-300);
  saveState();
  renderMeals();
  closeFoodLog();
  form.reset();
  const synced = await trackEvent('food_added', food);
  showToast(synced ? `${food.name} added and synced` : `${food.name} added to ${activeDay}'s food log`);
}
async function removeManualFood(id) {
  const food = (state.manualFoods || []).find((item) => item.id === id);
  if (!food) return;
  state.manualFoods = state.manualFoods.filter((item) => item.id !== id);
  saveState();
  renderMeals();
  const synced = await trackEvent('food_removed', { id, day: activeDay, name: food.name });
  showToast(synced ? `${food.name} removed and synced` : `${food.name} removed`);
}
$$('.add-food-button').forEach((button) => button.addEventListener('click', openFoodLog));
$('.food-log-close')?.addEventListener('click', closeFoodLog);
$('.food-log-cancel')?.addEventListener('click', closeFoodLog);
$('.food-log-modal')?.addEventListener('click', (event) => { if (event.target === event.currentTarget) closeFoodLog(); });
$('#food-log-form')?.addEventListener('submit', saveManualFood);
$('.meal-plan-full-card')?.addEventListener('click', (event) => {
  const button = event.target.closest('.manual-food-remove');
  if (button) removeManualFood(button.dataset.foodId);
});

async function regenerateCurrentPlan() {
  const buttons = $$('.generate-button');
  buttons.forEach((button) => {
    button.disabled = true;
    button.innerHTML = '<svg class="icon"><use href="#icon-spark"/></svg> Updating workout &amp; meals…';
  });
  showToast('Refreshing your workout, meals, calories, and progress…');
  try {
    await updateDay(activeDay, { force: true, quiet: true });
    // Keep every page in sync with the newly generated plan immediately.
    renderWorkout();
    renderMeals();
    renderProgressIntelligence(activePlan?.adaptation || analyzeProgress(state.progressLogs, state.profile));
    renderLiveProgress();
    showToast('Your fresh workout and meal plan are ready');
  } catch (error) {
    console.info('[fitly] Plan regeneration failed:', error.message);
    showToast('Could not refresh the plan — please try again');
  } finally {
    buttons.forEach((button) => {
      button.disabled = false;
      button.innerHTML = '<svg class="icon"><use href="#icon-spark"/></svg> Generate new plan';
    });
  }
}
$$('.generate-button').forEach((generateButton) => generateButton.addEventListener('click', regenerateCurrentPlan));

$$('.workout-select').forEach((button) => button.addEventListener('click', () => {
  $$('.workout-select').forEach((item) => item.classList.remove('is-selected'));
  button.classList.add('is-selected');
  showToast(`${button.dataset.workout} selected`);
}));
$('.workout-library-list')?.addEventListener('click', (event) => {
  const button = event.target.closest('.workout-select');
  if (!button?.dataset.day) return;
  const today = startOfDay();
  // In month mode rows have data-date (actual date); use it for future check
  if (button.dataset.date) {
    const rowDate = startOfDay(parseLocalDate(button.dataset.date));
    if (rowDate > today) return; // future date — locked
    // Sync week-picker to the week that contains this date
    const targetDay = button.dataset.day;
    // Move active week context to this day's week
    activeDay = targetDay;
    state.selectedDay = targetDay;
    saveState();
    updateDay(targetDay, { quiet: true });
  } else {
    const todayIndex = (new Date().getDay() + 6) % 7;
    const tabIndex = dayNames.indexOf(button.dataset.day);
    if (tabIndex > todayIndex) return; // future days in current week — locked
    updateDay(button.dataset.day, { quiet: true });
  }
});
$$('.library-view-all').forEach((button) => button.addEventListener('click', () => {
  workoutLibraryMode = workoutLibraryMode === 'month' ? 'week' : 'month';
  switchView('workout');
  renderWorkoutLibrary();
  updateWorkoutLibraryToggle();
}));
$$('.grocery-button').forEach((button) => button.addEventListener('click', openGroceryList));
$('.grocery-modal-close')?.addEventListener('click', closeGroceryList);
$('.grocery-modal-done')?.addEventListener('click', closeGroceryList);
$('.grocery-modal')?.addEventListener('click', (event) => { if (event.target === event.currentTarget) closeGroceryList(); });
$('#grocery-add-form')?.addEventListener('submit', addManualGroceryItem);
$('#grocery-items')?.addEventListener('click', (event) => {
  const removeButton = event.target.closest('.grocery-item-remove');
  if (removeButton) { removeManualGroceryItem(removeButton.dataset.groceryRemove); return; }
  const button = event.target.closest('.grocery-item-check');
  if (button) toggleGroceryItem(button);
});
$('.meal-prep-button').addEventListener('click', () => showToast('Prep mode: batch your rice, beans, and chopped vegetables'));
$('.progress-range-button').addEventListener('click', (event) => {
  event.currentTarget.classList.toggle('is-selected');
  event.currentTarget.innerHTML = event.currentTarget.classList.contains('is-selected') ? 'This week <svg class="icon"><use href="#icon-arrow"/></svg>' : 'Last 30 days <svg class="icon"><use href="#icon-arrow"/></svg>';
  showToast(event.currentTarget.classList.contains('is-selected') ? 'Showing this week' : 'Showing the last 30 days');
});
$('.progress-reflection').addEventListener('click', () => openDrawer('Help me reflect on this week’s progress'));

function syncPreferenceChoices() {
  const mappings = { goal: state.preferences.goal, food: state.preferences.food, equipment: state.preferences.equipment };
  $$('.choice-grid').forEach((group) => {
    const key = group.dataset.choiceGroup;
    $$('.choice', group).forEach((choice) => choice.classList.toggle('is-selected', choice.textContent === mappings[key]));
  });
}
function openPreferences() {
  syncPreferenceChoices();
  const modal = $('.preferences-modal');
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  $('.modal-card .choice')?.focus();
}
function closePreferences() {
  const modal = $('.preferences-modal');
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
}
$$('.nav-item[data-action="preferences"]').forEach((button) => button.addEventListener('click', openPreferences));
$$('.upgrade-card [data-action="preferences"]').forEach((button) => {
  if (button.firstChild) button.firstChild.textContent = 'Edit profile ';
  button.addEventListener('click', () => { switchView('profile'); populateProfilePage(); });
});
$('.modal-close').addEventListener('click', closePreferences);
$('.preferences-modal').addEventListener('click', (event) => { if (event.target === event.currentTarget) closePreferences(); });
$$('.choice').forEach((choice) => choice.addEventListener('click', () => {
  $$('.choice', choice.closest('.choice-grid')).forEach((item) => item.classList.remove('is-selected'));
  choice.classList.add('is-selected');
}));
function renderPreferenceChips() {
  const chipData = [`<i>◎</i> ${state.profile?.goal || state.preferences.goal}`, `<i>⌁</i> ${state.preferences.food}`, `<i>↗</i> ${state.preferences.equipment}`, `<i>₹</i> ${state.preferences.budget}`];
  $$('.preference-chips span').forEach((chip, index) => { chip.innerHTML = chipData[index]; });
}
$('.save-preferences').addEventListener('click', async () => {
  state.preferences = {
    ...state.preferences,
    goal: $('.choice.is-selected', $('[data-choice-group="goal"]'))?.textContent || state.preferences.goal,
    food: $('.choice.is-selected', $('[data-choice-group="food"]'))?.textContent || state.preferences.food,
    equipment: $('.choice.is-selected', $('[data-choice-group="equipment"]'))?.textContent || state.preferences.equipment
  };
  state.plans = {};
  let synced = false;
  try {
    const response = await fetch('/api/preferences', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ preferences: state.preferences }) });
    if (!response.ok) throw new Error(`Preferences sync failed (${response.status})`);
    const result = await response.json();
    state.preferences = result.preferences || state.preferences;
    synced = true;
  } catch (error) {
    console.info('[fitly] Preferences could not sync:', error.message);
  }
  renderPreferenceChips();
  closePreferences();
  showToast('Refreshing your personal mix…');
  await updateDay(activeDay, { force: true, quiet: true });
  showToast('Your personal mix has been updated');
  if (!synced) showToast('Could not sync preferences - reconnect and try again');
});

const drawer = $('.ai-drawer');
const drawerBackdrop = $('.drawer-backdrop');
function openDrawer(prefill = '') {
  drawer.classList.add('is-open');
  drawerBackdrop.classList.add('is-visible');
  drawer.setAttribute('aria-hidden', 'false');
  const input = $('.ai-form input');
  if (prefill) input.value = prefill;
  setTimeout(() => {
    scrollChatToBottom();
    input.focus();
  }, 240);
}
function closeDrawer() {
  drawer.classList.remove('is-open');
  drawerBackdrop.classList.remove('is-visible');
  drawer.setAttribute('aria-hidden', 'true');
}
$$('.ai-trigger').forEach((button) => button.addEventListener('click', () => openDrawer()));
$('.swap-trigger').addEventListener('click', () => openDrawer('Swap dinner for something I can make in one pan'));
$('.drawer-close').addEventListener('click', closeDrawer);
drawerBackdrop.addEventListener('click', closeDrawer);

const searchModal = $('.search-modal');
const searchInput = $('#search-input');
const searchClear = $('.search-clear');
const searchResults = $('#search-results');
let visibleSearchItems = [];
function buildSearchIndex() {
  const items = [
    { title: 'Overview', description: 'Your daily plan, today’s movement, and today’s fuel', view: 'overview', icon: 'icon-grid', keywords: 'home dashboard today plan' },
    { title: 'My workouts', description: 'Detailed exercises, sessions, and workout library', view: 'workout', icon: 'icon-dumbbell', keywords: 'movement exercise training session strength' },
    { title: 'Meal plans', description: 'Meals, calories, macros, and manual food logging', view: 'meals', icon: 'icon-leaf', keywords: 'food diet meals nutrition calories breakfast lunch dinner' },
    { title: 'Progress', description: 'Check-ins, weekly wins, trends, and activity', view: 'progress', icon: 'icon-chart', keywords: 'progress weight steps sleep recovery check-in' }
  ];
  const workout = activePlan?.workout;
  if (workout?.title) items.push({ title: workout.title, description: `Today’s workout · ${workout.type || 'Personalized session'}`, view: 'workout', target: '.detailed-workout-card', icon: 'icon-dumbbell', keywords: `${workout.description || ''} ${(workout.exercises || []).map((item) => item.name).join(' ')}` });
  (activePlan?.meals || []).slice(0, 4).forEach((meal) => items.push({ title: meal.title, description: `${meal.meal} · ${meal.kcal || 0} kcal`, view: 'meals', target: '.page-meals', icon: 'icon-leaf', keywords: `${meal.ingredients || ''} ${meal.meal || ''}` }));
  return items;
}
function renderSearchResults(query = '') {
  if (!searchResults) return;
  const normalized = String(query).trim().toLowerCase();
  const index = buildSearchIndex();
  visibleSearchItems = normalized ? index.filter((item) => `${item.title} ${item.description} ${item.keywords}`.toLowerCase().includes(normalized)) : index.slice(0, 7);
  if (searchClear) searchClear.hidden = !normalized;
  if (!visibleSearchItems.length) {
    searchResults.innerHTML = '<p class="search-empty">No matching Fitly content yet. Try “workout”, “meals”, or “progress”.</p>';
    return;
  }
  searchResults.innerHTML = visibleSearchItems.map((item, index) => `<button class="search-result" type="button" data-search-result="${index}"><span class="search-result-icon"><svg class="icon"><use href="#${item.icon}"/></svg></span><span class="search-result-copy"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.description)}</small></span><svg class="icon search-result-arrow"><use href="#icon-arrow"/></svg></button>`).join('');
  $$('.search-result', searchResults).forEach((button) => button.addEventListener('click', () => {
    const item = visibleSearchItems[Number(button.dataset.searchResult)];
    if (!item) return;
    closeSearch();
    switchView(item.view);
    if (item.target) window.setTimeout(() => document.querySelector(item.target)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  }));
}
function openSearch() {
  if (!searchModal) return;
  searchModal.classList.add('is-open');
  searchModal.setAttribute('aria-hidden', 'false');
  if (searchInput) { searchInput.value = ''; renderSearchResults(); window.setTimeout(() => searchInput.focus(), 120); }
}
function closeSearch() {
  if (!searchModal) return;
  searchModal.classList.remove('is-open');
  searchModal.setAttribute('aria-hidden', 'true');
}
searchInput?.addEventListener('input', () => renderSearchResults(searchInput.value));
searchClear?.addEventListener('click', () => { searchInput.value = ''; renderSearchResults(); searchInput.focus(); });
$('#search-form')?.addEventListener('submit', (event) => { event.preventDefault(); $$('.search-result', searchResults)[0]?.click(); });
$('.search-close')?.addEventListener('click', closeSearch);
searchModal?.addEventListener('click', (event) => { if (event.target === searchModal) closeSearch(); });

const notificationsModal = $('.notifications-modal');
const notificationList = $('#notification-list');
const notificationButton = $('.notification-button');
let notificationsRead = false;
function buildNotifications() {
  const workoutTitle = activePlan?.workout?.title || 'today’s personalized session';
  const workoutDone = Boolean(state.workouts?.[activeDay]?.completedAt);
  const completedMeals = (state.mealLogs || []).filter((log) => log?.completed && dateKey(log.date) === dateKey()).length;
  const items = [
    { title: workoutDone ? 'Workout complete' : 'Your workout is ready', description: workoutDone ? 'Great work — your completed session is included in Progress.' : `${workoutTitle} is ready when you are.`, view: 'workout', icon: 'icon-dumbbell' },
    { title: completedMeals ? `${completedMeals} meal${completedMeals === 1 ? '' : 's'} logged today` : 'Your meal plan is ready', description: completedMeals ? 'Keep logging meals to make today’s nutrition picture more accurate.' : 'Open Meal plans to review today’s fuel and mark meals complete.', view: 'meals', icon: 'icon-leaf' },
    { title: 'Small wins are tracking', description: 'Check your weekly activity, check-ins, and training trend in Progress.', view: 'progress', icon: 'icon-chart' }
  ];
  return items;
}
function renderNotifications() {
  if (!notificationList) return;
  const items = buildNotifications();
  notificationList.innerHTML = items.length ? items.map((item, index) => `<button class="notification-item ${notificationsRead ? '' : 'is-unread'}" type="button" data-notification-index="${index}"><span class="notification-icon"><svg class="icon"><use href="#${item.icon}"/></svg></span><span class="notification-copy"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.description)}</small></span></button>`).join('') : '<p class="notification-empty">You’re all caught up.</p>';
  $$('.notification-item', notificationList).forEach((button) => button.addEventListener('click', () => {
    const item = items[Number(button.dataset.notificationIndex)];
    if (!item) return;
    notificationsRead = true;
    notificationButton?.classList.add('is-read');
    closeNotifications();
    switchView(item.view);
  }));
}
function openNotifications() {
  if (!notificationsModal) return;
  renderNotifications();
  notificationsModal.classList.add('is-open');
  notificationsModal.setAttribute('aria-hidden', 'false');
}
function closeNotifications() {
  if (!notificationsModal) return;
  notificationsModal.classList.remove('is-open');
  notificationsModal.setAttribute('aria-hidden', 'true');
}
$('.notifications-close')?.addEventListener('click', closeNotifications);
$('.notifications-clear')?.addEventListener('click', () => {
  notificationsRead = true;
  notificationButton?.classList.add('is-read');
  renderNotifications();
  showToast('Notifications marked as read');
});
notificationsModal?.addEventListener('click', (event) => { if (event.target === notificationsModal) closeNotifications(); });

const helpModal = $('.help-modal');
function openHelpCentre() {
  if (!helpModal) return;
  closeDrawer();
  helpModal.classList.add('is-open');
  helpModal.setAttribute('aria-hidden', 'false');
  window.setTimeout(() => $('.help-close')?.focus(), 120);
}
function closeHelpCentre() {
  if (!helpModal) return;
  helpModal.classList.remove('is-open');
  helpModal.setAttribute('aria-hidden', 'true');
}
$('.help-close')?.addEventListener('click', closeHelpCentre);
helpModal?.addEventListener('click', (event) => { if (event.target === helpModal) closeHelpCentre(); });
$('.help-chat-button')?.addEventListener('click', () => {
  closeHelpCentre();
  openDrawer('I need help with my plan');
});

const termsModal = $('.terms-modal');
function openTerms() {
  if (!termsModal) return;
  termsModal.classList.add('is-open');
  termsModal.setAttribute('aria-hidden', 'false');
  window.setTimeout(() => $('.terms-close')?.focus(), 120);
}
function closeTerms() {
  if (!termsModal) return;
  termsModal.classList.remove('is-open');
  termsModal.setAttribute('aria-hidden', 'true');
}
$$('[data-action="terms"]').forEach((button) => button.addEventListener('click', (event) => { event.stopPropagation(); openTerms(); }));
$('.terms-close')?.addEventListener('click', closeTerms);
$('.terms-acknowledge')?.addEventListener('click', closeTerms);
termsModal?.addEventListener('click', (event) => { if (event.target === termsModal) closeTerms(); });

function formatChatText(text) {
  const normalized = String(text || '').replace(/\r\n?/g, '\n').trim();
  let safe = escapeHtml(normalized);
  safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  safe = safe.replace(/(^|\n)\s*#{1,6}\s+/g, '$1');
  safe = safe.replace(/(^|\n)\s*[-•]\s+/g, '$1<span class="chat-bullet">•</span> ');
  safe = safe.replace(/\*\*/g, '');
  return safe.replace(/\n{2,}/g, '<br/><br/>').replace(/\n/g, '<br/>');
}
function scrollChatToBottom() {
  const container = $('.chat-messages');
  if (!container) return;
  container.scrollTop = container.scrollHeight;
}
function addChatMessage(text, type, persist = true) {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${type}-bubble`;
  if (type === 'ai') bubble.innerHTML = formatChatText(text);
  else bubble.textContent = text;
  $('.chat-messages').appendChild(bubble);
  if (persist) {
    state.chat = [...state.chat, { text, type }].slice(-8);
  }
  scrollChatToBottom();
}
function restoreChat() {
  if (!state.chat.length) return;
  $('.chat-messages').replaceChildren();
  state.chat.forEach((message) => addChatMessage(message.text, message.type, false));
  scrollChatToBottom();
}
function localReply(question) {
  const lower = question.toLowerCase();
  if (/(chest pain|faint|fainted|trouble breathing|severe pain|heart racing|emergency)/i.test(lower)) return 'Please stop the workout and seek urgent medical help for those symptoms. Fitly cannot assess emergencies or replace a clinician.';
  if (/(purge|vomit|starve|not eat|eating disorder|binge|as little as possible)/i.test(lower)) return 'I can’t help plan extreme restriction or compensatory exercise. Please speak with a qualified healthcare professional or a trusted person today.';
  if (state.progressAnalysis?.weeklyChange !== null && state.progressAnalysis?.weeklyChange !== undefined && /(weight|trend|gain|loss|fat|progress)/i.test(lower)) return `Your recent trend is ${state.progressAnalysis.weeklyChange > 0 ? '+' : ''}${state.progressAnalysis.weeklyChange} kg/week. Use the 7-day average rather than one weigh-in, and I can help adjust gradually.`;
  if (lower.includes('20') || lower.includes('short')) return 'Absolutely. I trimmed today to three rounds: squats, incline push-ups, and dead bugs. You’ll be done in about 20 minutes.';
  if (lower.includes('swap') || lower.includes('dinner') || lower.includes('vegetarian')) return `Try a one-pan chickpea pulao with cucumber raita. It pairs well with your ${state.preferences.food} preferences and stays budget-friendly.`;
  if (lower.includes('prep') || lower.includes('15')) return 'Start with the rice bowl base: use pre-cooked beans, microwave rice, cucumber, and curd. Add lemon and chilli at the end.';
  return 'I’ll keep it realistic: low-impact movement, familiar ingredients, and enough flexibility for a full student day. Want to change the workout, a meal, or the timing?';
}
async function requestChat(question) {
  try {
    const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: question, profile: state.profile, context: { preferences: state.preferences, day: activeDay, plan: activePlan, progressLogs: state.progressLogs, progressAnalysis: state.progressAnalysis, trainingLogs: state.trainingLogs } }) });
    if (!response.ok) throw new Error(`Chat request failed (${response.status})`);
    return await response.json();
  } catch (error) {
    console.info('[fitly] Using local chat fallback:', error.message);
    return { reply: localReply(question), source: 'local' };
  }
}
async function sendAiMessage(text) {
  if (!text.trim()) return;
  addChatMessage(text.trim(), 'user');
  $('.ai-form input').value = '';
  const typing = document.createElement('div');
  typing.className = 'chat-bubble ai-bubble typing-bubble';
  typing.textContent = 'Thinking through your options…';
  $('.chat-messages').appendChild(typing);
  const result = await requestChat(text.trim());
  typing.remove();
  addChatMessage(result.reply, 'ai');
  if (result.source === 'local') {
    if (result.reason === 'rate_limited') showToast(`AI guidance is busy — try again in about ${result.retryAfterSeconds || 60}s`);
    else if (result.reason === 'not_configured') showToast('AI guidance is not configured yet');
    else showToast('AI guidance is unavailable — using Fitly local guidance');
  }
}
$('.ai-form').addEventListener('submit', (event) => { event.preventDefault(); sendAiMessage($('.ai-form input').value); });
$$('.suggestions button').forEach((button) => button.addEventListener('click', () => sendAiMessage(button.textContent)));

$$('[data-action="help"]').forEach((button) => button.addEventListener('click', openHelpCentre));
$('.search-button').addEventListener('click', openSearch);
$('.notification-button').addEventListener('click', openNotifications);
$('.view-all').addEventListener('click', () => switchView('meals'));
$$('.kebab').forEach((button) => button.addEventListener('click', () => showToast('More options coming soon')));
$('.exercise-preview .circle-arrow').addEventListener('click', () => {
  const list = $('.exercise-preview .exercise-list');
  if (!list) return;
  const atEnd = list.scrollLeft + list.clientWidth >= list.scrollWidth - 4;
  const amount = Math.max(190, Math.round(list.clientWidth * .78));
  list.scrollBy({ left: atEnd ? -amount : amount, behavior: 'smooth' });
  window.setTimeout(() => updateExercisePreviewArrow(list), 350);
});
const sidebar = $('.sidebar');
const sidebarBackdrop = $('.sidebar-drawer-backdrop');

function openSidebar() {
  sidebar?.classList.add('is-open');
  sidebarBackdrop?.classList.add('is-visible');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  sidebar?.classList.remove('is-open');
  sidebarBackdrop?.classList.remove('is-visible');
  document.body.style.overflow = '';
}

$('.mobile-menu')?.addEventListener('click', openSidebar);
$('.sidebar-close')?.addEventListener('click', closeSidebar);
sidebarBackdrop?.addEventListener('click', closeSidebar);

// Close drawer when any nav item or action button inside sidebar is tapped
$$('.sidebar .nav-item, .sidebar [data-action]').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (window.innerWidth <= 768) closeSidebar();
  });
});

const onboardingScreen = $('#onboarding-screen');
function setOnboardingStep(step) {
  $$('.onboarding-step').forEach((panel) => {
    const active = panel.dataset.onboardingStep === step;
    panel.classList.toggle('is-active', active);
    panel.hidden = !active;
  });
  $$('.onboarding-progress-dot').forEach((dot, index) => dot.classList.toggle('is-current', step === 'welcome' ? index === 0 : index === 1));
}
function showOnboarding(step = 'welcome') {
  document.body.classList.add('onboarding-active');
  onboardingScreen.hidden = false;
  setOnboardingStep(step);
}
function hideOnboarding() {
  document.body.classList.remove('onboarding-active');
  onboardingScreen.hidden = true;
}
function updateUserChrome() {
  const name = state.user?.name || 'Alex Kumar';
  const firstName = name.trim().split(/\s+/)[0] || 'Alex';
  const sidebarName = $('.sidebar-user strong');
  if (sidebarName) sidebarName.textContent = name;
  $$('.avatar').forEach((avatar) => { avatar.textContent = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AK'; });
  const welcomeEyebrow = $('.welcome-copy .eyebrow');
  if (welcomeEyebrow) {
    const dot = document.createElement('span');
    dot.className = 'eyebrow-dot';
    welcomeEyebrow.replaceChildren(dot, document.createTextNode(` GOOD MORNING, ${firstName.toUpperCase()}`));
  }
  const signedInName = $('.signed-in-name');
  if (signedInName) signedInName.textContent = state.user?.name || state.user?.email || '';
  $('.signed-in-note')?.toggleAttribute('hidden', !state.user);
  const accountName = $('.account-menu-name');
  if (accountName) accountName.textContent = state.user?.name || 'Fitly student';
  const accountEmail = $('.account-menu-email');
  if (accountEmail) accountEmail.textContent = state.user?.email || 'Local profile';
  const profileName = $('.profile-page-name');
  if (profileName) profileName.textContent = state.user?.name || 'Fitly student';
  const profileEmail = $('.profile-page-email');
  if (profileEmail) profileEmail.textContent = state.user?.email || 'Local profile';
}
const profileFormFields = ['age', 'sex', 'weight', 'height', 'activity', 'trainingDays', 'dailySteps', 'sleepHours', 'experience', 'sessionMinutes', 'diet', 'equipment', 'split', 'goal', 'bodyFat', 'targetBodyFat', 'exercisePreferences', 'exercisesToAvoid', 'healthIssues', 'surgery'];
function populateProfilePage() {
  const form = $('.profile-page-form');
  if (!form) return;
  const profile = state.profile || {};
  const displayName = form.elements.displayName;
  if (displayName) displayName.value = state.user?.name || '';
  profileFormFields.forEach((key) => {
    const field = form.elements[key];
    if (field) field.value = profile[key] ?? '';
  });
  const consent = form.elements.profileConsent;
  if (consent) consent.checked = profile.consent !== false;
  updateUserChrome();
}
function profileFromForm(form) {
  const formData = new FormData(form);
  const profile = { ...(state.profile || {}) };
  profileFormFields.forEach((key) => { if (formData.has(key)) profile[key] = formData.get(key); });
  profile.consent = true;
  profile.updatedAt = new Date().toISOString();
  return profile;
}
function closeAccountMenu() {
  const menu = $('.account-menu');
  const backdrop = $('.account-menu-backdrop');
  const trigger = $('.more-button');
  if (!menu) return;
  menu.hidden = true;
  if (backdrop) backdrop.hidden = true;
  trigger?.setAttribute('aria-expanded', 'false');
}
function openAccountMenu() {
  const menu = $('.account-menu');
  const backdrop = $('.account-menu-backdrop');
  const trigger = $('.more-button');
  if (!menu) return;
  menu.hidden = false;
  if (backdrop) backdrop.hidden = false;
  trigger?.setAttribute('aria-expanded', 'true');
  updateUserChrome();
}
$('.more-button')?.addEventListener('click', (event) => {
  event.stopPropagation();
  const menu = $('.account-menu');
  if (menu?.hidden) openAccountMenu(); else closeAccountMenu();
});
$('.sidebar-user')?.addEventListener('click', (event) => {
  if (!event.target.closest('.account-menu') && !event.target.closest('.more-button')) openAccountMenu();
});
$('.account-menu')?.addEventListener('click', async (event) => {
  const action = event.target.closest('[data-account-action]')?.dataset.accountAction;
  if (!action) return;
  event.stopPropagation();
  closeAccountMenu();
  if (action === 'profile') {
    switchView('profile');
    populateProfilePage();
    return;
  }
  if (action === 'privacy') {
    switchView('privacy');
    return;
  }
  if (action === 'signout') {
    await trackEvent('signed_out');
    try { await fetch('/api/logout', { method: 'POST' }); } catch { /* Local sign-out still completes if the server is unavailable. */ }
    localStorage.removeItem(STATE_KEY);
    window.location.reload();
  }
});
$('.account-menu-backdrop')?.addEventListener('click', closeAccountMenu);
document.addEventListener('click', closeAccountMenu);
let googleIdentityAttempts = 0;
let googleOAuthHealth = null;
function setupGoogleIdentity() {
  fetch('/api/health', { cache: 'no-store' }).then((response) => response.json()).then((health) => {
    googleOAuthHealth = health;
    if (!health.googleConfigured || !health.googleClientId) return;
    const render = () => {
      // Use the server-side OAuth flow for the visible button. It keeps the
      // client secret on the server and returns through /auth/google/callback.
      const fallback = $('.google-login');
      if (fallback) {
        $('#google-signin-button')?.setAttribute('hidden', '');
        fallback.removeAttribute('hidden');
        return;
      }
      if (!window.google?.accounts?.id) {
        if (googleIdentityAttempts++ < 30) {
          setTimeout(render, 250);
        } else {
          const note = $('.login-note');
          if (note) note.textContent = 'Google button unavailable. Use the configured localhost URL, then try again.';
        }
        return;
      }
      let configuredOrigin = window.location.origin;
      try { configuredOrigin = new URL(health.googleRedirectUri || window.location.origin).origin; } catch { /* Keep the current origin if the diagnostic value is unavailable. */ }
      if (window.location.origin !== configuredOrigin) {
        const note = $('.login-note');
        if (note) note.textContent = `Open ${configuredOrigin} for Google sign-in.`;
        return;
      }
      const container = $('#google-signin-button');
      if (!container) return;
      window.google.accounts.id.initialize({ client_id: health.googleClientId, callback: handleGoogleCredential, auto_select: false, cancel_on_tap_outside: true });
      window.google.accounts.id.renderButton(container, { theme: 'outline', size: 'large', shape: 'rectangular', text: 'signin_with', width: 280 });
      container.hidden = false;
      fallback?.setAttribute('hidden', '');
      const note = $('.login-note');
      if (note) note.textContent = 'Secure Google sign-in · We only ask for your basic profile';
    };
    render();
  }).catch(() => { /* The normal fallback button will explain the server setup. */ });
}
async function handleGoogleCredential(credentialResponse) {
  if (!credentialResponse?.credential) return;
  try {
    const response = await fetch('/api/auth/google', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential: credentialResponse.credential }) });
    if (!response.ok) throw new Error('Google credential verification failed');
    const result = await response.json();
    state.user = result.user || state.user;
    if (result.profile) state.profile = result.profile;
    state.onboardingComplete = Boolean(state.profile);
    saveState();
    updateUserChrome();
    if (state.profile) hideOnboarding();
    else showOnboarding('profile');
    if (state.profile) await hydrateSignedInData();
    showToast(`Welcome${state.user?.name ? `, ${state.user.name.split(/\s+/)[0]}` : ''} — let’s make it personal`);
  } catch (error) {
    console.info('[fitly] Google GIS sign-in failed:', error.message);
    showToast('Google sign-in could not be completed. Check the OAuth client settings.');
  }
}
$$('.goal-choice').forEach((choice) => choice.addEventListener('click', () => {
  $$('.goal-choice').forEach((item) => item.classList.remove('is-selected'));
  choice.classList.add('is-selected');
}));
$('.google-login')?.addEventListener('click', async (event) => {
  event.preventDefault();
  const note = $('.login-note');
  try {
    const response = await fetch('/api/health', { cache: 'no-store' });
    const health = await response.json();
    googleOAuthHealth = health;
    if (!health.googleConfigured) {
      if (note) note.textContent = 'Google login is not configured yet — use demo mode or add OAuth credentials.';
      showToast('Google login needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
      return;
    }
    const redirectUri = health.googleRedirectUri || '';
    const configuredOrigin = redirectUri ? new URL(redirectUri).origin : window.location.origin;
    if (window.location.origin !== configuredOrigin) {
      if (note) note.textContent = `Open ${configuredOrigin} for Google sign-in.`;
      showToast(`Opening Fitly at ${configuredOrigin}`);
      window.location.href = `${configuredOrigin}${window.location.pathname}`;
      return;
    }
    window.location.href = '/auth/google';
  } catch {
    if (note) note.textContent = 'Fitly server is unavailable. Start node server.js, then try again.';
    showToast('Could not connect to the Fitly server');
  }
});
$('.profile-page-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const profile = profileFromForm(form);
  const displayName = String(form.elements.displayName?.value || state.user?.name || 'Fitly student').trim().slice(0, 80);
  const accountUser = state.user ? { ...state.user, name: displayName } : { name: displayName, email: '' };
  const submit = $('.profile-save-button', form);
  const status = $('.profile-save-status', form);
  if (submit) { submit.disabled = true; submit.innerHTML = 'Saving profile…'; }
  try {
    const response = await fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile, preferences: state.preferences, date: dayDate(activeDay).toISOString(), user: accountUser }) });
    if (!response.ok) throw new Error(`Profile update failed (${response.status})`);
    const result = await response.json();
    state.profile = result.profile || profile;
    state.user = result.user || accountUser;
    state.onboardingComplete = true;
    state.plans = { ...(state.plans || {}), [activeDay]: result.plan };
    saveState();
    updateUserChrome();
    renderPreferenceChips();
    await updateDay(activeDay, { quiet: true });
    populateProfilePage();
    if (status) status.textContent = 'Saved and synced just now';
    showToast('Profile updated — your plan is adapting');
  } catch (error) {
    console.info('[fitly] Profile could not sync:', error.message);
    state.profile = profile;
    state.user = accountUser;
    state.onboardingComplete = true;
    saveState();
    updateUserChrome();
    renderPreferenceChips();
    populateProfilePage();
    if (status) status.textContent = 'Could not sync — reconnect and try again';
    showToast('Profile could not sync');
  } finally {
    if (submit) { submit.disabled = false; submit.innerHTML = '<svg class="icon"><use href="#icon-check"/></svg> Save profile'; }
  }
});
$('.onboarding-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const formData = new FormData(form);
  const profile = {
    age: formData.get('age'),
    sex: formData.get('sex'),
    weight: formData.get('weight'),
    height: formData.get('height'),
    activity: formData.get('activity'),
    trainingDays: formData.get('trainingDays'),
    fitnessLevel: formData.get('fitnessLevel'),
    equipment: formData.get('equipment'),
    exercisePreferences: formData.get('exercisePreferences'),
    exercisesToAvoid: formData.get('exercisesToAvoid'),
    currentLifts: formData.get('currentLifts'),
    split: formData.get('split'),
    experience: formData.get('experience'),
    sessionMinutes: formData.get('sessionMinutes'),
    dailySteps: formData.get('dailySteps'),
    bodyFat: formData.get('bodyFat'),
    targetBodyFat: formData.get('targetBodyFat'),
    diet: formData.get('diet'),
    sleepHours: formData.get('sleepHours'),
    sleepQuality: formData.get('sleepQuality'),
    fatigue: formData.get('fatigue'),
    stress: formData.get('stress'),
    healthIssues: formData.get('healthIssues'),
    surgery: formData.get('surgery'),
    goal: $('.goal-choice.is-selected')?.dataset.goal || 'Strength training',
    consent: formData.get('consent') === 'on',
    termsAccepted: formData.get('termsAccepted') === 'on',
    termsAcceptedAt: new Date().toISOString()
  };
  const submit = $('.onboarding-submit');
  submit.disabled = true;
  submit.innerHTML = 'Building your plan…';
  try {
    const response = await fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile, preferences: state.preferences, date: dayDate(activeDay).toISOString(), user: state.user }) });
    if (!response.ok) throw new Error(`Onboarding request failed (${response.status})`);
    const result = await response.json();
    state.profile = result.profile || profile;
    state.user = result.user || state.user;
    state.onboardingComplete = true;
    state.plans = { ...(state.plans || {}), [activeDay]: result.plan };
    saveState();
    updateUserChrome();
    renderPreferenceChips();
    hideOnboarding();
    await updateDay(activeDay, { quiet: true });
    showToast(`Your ${profile.goal.toLowerCase()} plan is ready`);
  } catch (error) {
    console.info('[fitly] Onboarding could not sync:', error.message);
    state.profile = profile;
    state.onboardingComplete = true;
    saveState();
    updateUserChrome();
    renderPreferenceChips();
    hideOnboarding();
    await updateDay(activeDay, { quiet: true });
    showToast('Could not create your plan - reconnect and try again');
  } finally {
    submit.disabled = false;
    submit.innerHTML = 'Create my plan <svg class="icon"><use href="#icon-arrow"/></svg>';
  }
});
async function hydrateAccount() {
  const query = new URLSearchParams(location.search);
  try {
    const handoff = query.get('auth_handoff');
    if (handoff) {
      const handoffResponse = await fetch('/api/auth/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handoff }) });
      if (handoffResponse.ok) {
        const handoffSession = await handoffResponse.json();
        if (handoffSession.user) state.user = handoffSession.user;
        if (handoffSession.profile && !state.profile) { state.profile = handoffSession.profile; state.onboardingComplete = true; }
        if (handoffSession.preferences) state.preferences = { ...state.preferences, ...handoffSession.preferences };
        if (Array.isArray(handoffSession.chat)) state.chat = handoffSession.chat.slice(-8);
      }
    }
    const response = await fetch('/api/session', { cache: 'no-store' });
    if (response.ok) {
      const session = await response.json();
      if (session.user) state.user = session.user;
      if (session.profile && !state.profile) { state.profile = session.profile; state.onboardingComplete = true; }
      if (session.preferences) state.preferences = { ...state.preferences, ...session.preferences };
      if (Array.isArray(session.chat)) state.chat = session.chat.slice(-8);
    }
  } catch { /* Static mode falls back to local onboarding. */ }
  updateUserChrome();
  renderPreferenceChips();
  restoreChat();
  setupGoogleIdentity();
  const authStatus = query.get('auth');
  const signedIn = query.get('signed_in') === '1';
  const authReason = query.get('reason');
  const authStage = query.get('stage');
  if (authStatus === 'not_configured') showToast('Google login needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
  if (authStatus === 'denied') showToast(`Google authorization was denied${authReason ? ` (${authReason})` : ''}. Check the OAuth client settings and test users.`);
  if (authStatus === 'failed') showToast(authStage === 'invalid_client' ? 'Google rejected the OAuth client secret. Generate a new secret and update .env.google.local.' : `Google sign-in failed${authStage ? ` during ${authStage.replaceAll('_', ' ')}` : ''}. Check the OAuth client settings and callback URI.`);
  if (authStatus === 'missing_code') showToast('Google did not return an authorization code. Please try again.');
  if (authStatus === 'invalid_state') showToast('Google sign-in expired. Please try again.');
  if (state.onboardingComplete && state.profile) hideOnboarding();
  else if (state.user || signedIn) showOnboarding('profile');
  else showOnboarding('welcome');
  if (history.replaceState && location.search) history.replaceState({}, document.title, location.pathname);
}

renderPreferenceChips();
updateLiveHeader();
hydrateAccount().then(() => hydrateSignedInData());
async function checkLiveService() {
  const statusText = $('.ai-status-text');
  const statusDot = $('.online-dot');
  if (!statusText || !statusDot) return;
  try {
    const response = await fetch('/api/health', { cache: 'no-store' });
    const health = await response.json();
    const live = health.aiStatus === 'connected';
    const rateLimited = health.aiStatus === 'rate_limited';
    if (live) {
      statusText.textContent = ' FITLY AI LIVE';
      statusDot.classList.add('is-live');
      statusDot.classList.remove('is-local');
    } else if (rateLimited) {
      const retrySeconds = Number.isFinite(Number(health.aiRetryAfterSeconds)) && health.aiRetryAfterSeconds > 0 ? ` — retry in ${health.aiRetryAfterSeconds}s` : '';
      statusText.textContent = ` FITLY AI BUSY${retrySeconds}`;
      statusDot.classList.remove('is-live');
      statusDot.classList.add('is-local');
      const pollDelay = Math.min(10000, Math.max(3000, (Number(health.aiRetryAfterSeconds) || 10) * 1000));
      setTimeout(checkLiveService, pollDelay);
    } else {
      statusText.textContent = health.aiConfigured ? ' FITLY AI READY' : ' FITLY AI LOCAL';
      statusDot.classList.toggle('is-live', false);
      statusDot.classList.toggle('is-local', !health.aiConfigured);
      setTimeout(checkLiveService, 30000);
    }
  } catch {
    statusText.textContent = ' LOCAL MODE';
    statusDot.classList.add('is-local');
    setTimeout(checkLiveService, 15000);
  }
}
checkLiveService();
setInterval(checkLiveService, 60000);
setInterval(updateLiveHeader, 30000);
setInterval(updateWorkoutTimer, 1000);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { closeDrawer(); closeSearch(); closeNotifications(); closeHelpCentre(); closeTerms(); closePreferences(); } });

// Offline detection — redirect to 404 page when device loses connectivity
window.addEventListener('offline', () => { location.replace('/404.html?offline=1'); });
if (!navigator.onLine) { location.replace('/404.html?offline=1'); }
