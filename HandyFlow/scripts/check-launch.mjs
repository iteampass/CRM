// Read configuration without displaying credentials or sending email/writing data.
import { loadEnv } from 'vite';
const env = { ...loadEnv('production', process.cwd(), ''), ...process.env };
const expected = 'https://rtaszifelvzbvcbqgrig.supabase.co';
const errors = [];
for (const key of ['VITE_SUPABASE_URL', 'SUPABASE_URL']) {
  if (env[key]?.replace(/\/$/, '') !== expected) errors.push(`${key} must target the shared CRM project.`);
}
for (const key of ['VITE_SUPABASE_PUBLISHABLE_KEY','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SERVICE_ROLE_KEY','RESEND_API_KEY','EMAIL_FROM']) {
  if (!env[key] || /your-|placeholder/i.test(env[key])) errors.push(`${key} is missing or a placeholder.`);
}
for (const key of ['VITE_SUPABASE_PUBLISHABLE_KEY','SUPABASE_PUBLISHABLE_KEY']) {
  const value = env[key] ?? '';
  if (value.startsWith('sb_secret_')) errors.push(`${key} contains a server secret.`);
  if (value.split('.').length === 3) {
    try {
      const claims = JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString());
      if (claims.role !== 'anon' || claims.ref !== 'rtaszifelvzbvcbqgrig') errors.push(`${key} must be the shared project's anon key.`);
    } catch { errors.push(`${key} is malformed.`); }
  } else if (!value.startsWith('sb_publishable_')) errors.push(`${key} must be a publishable or anon key.`);
}
if (env.VITE_SUPABASE_PUBLISHABLE_KEY !== env.SUPABASE_PUBLISHABLE_KEY) errors.push('Browser and server public keys differ.');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
if (process.argv.includes('--remote')) {
  const response = await fetch(`${expected}/rest/v1/repair_categories?select=id&limit=1`, {
    headers: { apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY, 'Accept-Profile': 'handyflow' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) { console.error(`HandyFlow Data API check failed (HTTP ${response.status}). Check key, migration, schema exposure and grants.`); process.exit(1); }
}
console.log('Launch configuration checks passed. Auth, email delivery and user flows still require smoke testing.');
