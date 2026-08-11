const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
function loadEnvFile(fileName) {
  const filePath = path.join(ROOT, fileName);
  if (!fs.existsSync(filePath)) return;
  fs.readFileSync(filePath, 'utf8').split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) return;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  });
}
loadEnvFile('.env.local');
loadEnvFile('.env');

const supabaseUrl = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const supabaseKey = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const table = String(process.env.SUPABASE_TABLE || 'fitly_users').trim() || 'fitly_users';
const dataFile = process.env.FITLY_DATA_FILE ? path.resolve(ROOT, process.env.FITLY_DATA_FILE) : path.join(ROOT, 'data', 'fitly-data.json');

function headers() {
  const result = { apikey: supabaseKey, 'Content-Type': 'application/json' };
  if (!supabaseKey.startsWith('sb_')) result.Authorization = `Bearer ${supabaseKey}`;
  return result;
}
function rowFor(id, record = {}) {
  return {
    id,
    created_at: record.createdAt || new Date().toISOString(),
    user_data: record.user || null,
    profile: record.profile || null,
    preferences: record.preferences || null,
    progress_logs: Array.isArray(record.progressLogs) ? record.progressLogs : [],
    training_logs: Array.isArray(record.trainingLogs) ? record.trainingLogs : [],
    activity_logs: Array.isArray(record.activityLogs) ? record.activityLogs : [],
    chat: Array.isArray(record.chat) ? record.chat : []
  };
}

async function main() {
  if (!supabaseUrl || !supabaseKey) throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required');
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const entries = Object.entries(data.users || {});
  const statuses = [];
  for (const [id, record] of entries) {
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?on_conflict=id`, { method: 'POST', headers: { ...headers(), Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rowFor(id, record)) });
    statuses.push(response.status);
    if (!response.ok) throw new Error(`Migration failed with HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  const verify = await fetch(`${supabaseUrl}/rest/v1/${table}?select=id&limit=10000`, { headers: headers() });
  if (!verify.ok) throw new Error(`Verification failed with HTTP ${verify.status}`);
  const remoteRows = await verify.json();
  console.log(JSON.stringify({ migrated: entries.length, statuses, supabaseRecords: Array.isArray(remoteRows) ? remoteRows.length : 0 }));
}

main().catch((error) => { console.error(`[fitly] ${error.message}`); process.exitCode = 1; });
