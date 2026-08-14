# Fitly — Personalized Workout & Diet Planner

Fitly is a runnable student-focused fitness planner. It combines a weekly movement plan, culturally familiar budget-aware meals, progress signals, persisted user preferences, a live workout timer, and a backend-ready AI assistant.

## Run locally (Python)

Install dependencies and start the Python server:

```bash
pip install -r requirements.txt
python server.py
```

Then visit `http://localhost:5173`. Python 3.9+ is required. The app can still be opened as a static file, but API-backed plan generation, chat, and account persistence require the Python server.

To enable live Gemini responses and AI-generated plans, set `GEMINI_API_KEY` before starting the server. The key stays on the server and is never sent to the browser. See [.env.example](.env.example) for all environment variables.

On Windows, copy `.env.example` to `.env.local`, add your key, then restart:

```powershell
Copy-Item .env.example .env.local
notepad .env.local
python server.py
```

For real Google login, create a Web application OAuth client in Google Cloud and add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and the exact redirect URI from `.env.example`. If these values are absent, the app offers demo mode so you can still complete onboarding locally.

## Supabase persistence

Create a Supabase project, run [supabase/schema.sql](supabase/schema.sql) in its SQL Editor, then add `SUPABASE_URL` and the server-only `SUPABASE_SECRET_KEY` to `.env.local`. When both values are configured, Supabase becomes the primary store for profiles, progress, activity, preferences, and chat. Set `SUPABASE_MIGRATE_FILE=true` once to copy existing records from `data/fitly-data.json`; the file is retained as a backup and is no longer read or written while Supabase is active.

## Included interactions

- Day-by-day workout plan switching
- Detailed workout blueprints with 2-6 day frequency selection, full-body / upper-lower / push-pull-legs splits, warm-up ramps, exercise-specific sets, reps, RIR, rest, technique cues, common mistakes, substitutions, regressions, and cooldowns
- Goal-aware training: strength uses lower compound rep ranges, bulking prioritizes quality hypertrophy volume, and fat loss prioritizes muscle retention with protected recovery
- Recovery-aware volume reduction, double-progression rules, weekly muscle-volume snapshots, and session tracking prompts
- Training setup inputs for experience, equipment, preferred split, exercises to avoid, current lifts, and movement preferences
- Separate Overview, My workouts, Meal plans, and Progress pages with dedicated content
- Current date, selected-day date, live clock, and workout timer
- Server-persisted workout state, meal completion logging, preferences, and chatbot history per signed-in account
- Macro progress updates based on completed meals
- Mifflin–St Jeor BMR, activity-factor TDEE, goal calories, protein/fat/carbs, fiber, lean-mass, and weekly weight-trend estimates from onboarding data
- Body-composition estimates for BMI, lean mass, fat mass, and goal weight
- Daily progress check-ins for weight, measurements, calories, protein, steps, sleep, soreness, fatigue, and stress
- Green completion ticks for finished workouts and logged meals, with completion events synced to `GET/POST /api/activity`; meaningful UI events, selected days, workout starts, and generated plan snapshots are stored in the same per-user activity history
- Live progress score, workout streak, active time, meal consistency, weekly chart, and recent wins derived from actual completion and check-in data
- Adaptive recommendations from 7-day and 14-day weight trends, with recovery-aware workout adjustments
- Progressive-overload top-set logging using reps, load, and RPE
- Vegetarian and vegan meal adaptations for the local fallback planner
- Personalized preference modal for goal, food style, and equipment
- `POST /api/plan` generates a plan from preferences and date
- `POST /api/chat` uses Gemini or a local fallback
- `POST /api/plan` uses Gemini to generate a structured plan when configured
- `GET/POST /api/progress` stores check-ins and returns adaptive trend analysis
- `GET/POST /api/training` stores top sets for progressive-overload recommendations
- `GET/POST /api/activity` stores per-user workout, meal, and exercise completion events
- `GET /api/health` reports server time, Gemini configuration, and model
- Responsive sidebar, mobile navigation, and compact cards for smaller screens

Google users are identified by Google’s stable account ID, so different Gmail accounts receive separate profiles and progress histories. Without Supabase, user records and sessions are persisted to `data/fitly-data.json`; set `FITLY_DATA_FILE` to place that file on a durable volume. Supabase is recommended for a live multi-user deployment. For production, use HTTPS, production OAuth origins and redirect URIs, and keep the service-role key only on the server.

The server serves both the frontend and JSON API. Its only runtime dependencies are `flask` and `requests`. The local data file contains account profile and progress data, so keep it private and back it up securely.

Nutrition estimates are starting points, not medical advice. Fitly uses the formula sheet supplied with this project: a 5–15% surplus for bulking, a 10–25% deficit for fat loss, 1.6–2.2 g/kg protein (1.8–2.4 g/kg during fat loss), 0.6–1.0 g/kg fat, remaining calories as carbohydrate, and 14 g fiber per 1,000 kcal. Recheck a 7-day average after 2–3 weeks and adjust by roughly 100–200 kcal when the trend is consistently off target.
