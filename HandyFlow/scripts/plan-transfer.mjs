import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Produces a review plan only. Matching emails never automatically merge accounts.
export function planIdentities(source, destination) {
  function index(rows, label) {
    if (!Array.isArray(rows)) throw new Error(`${label} must be a JSON array.`);
    const ids = new Map(), emails = new Map();
    for (const user of rows) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id ?? '')) throw new Error(`${label} contains an invalid user UUID.`);
      const email = String(user.email ?? '').trim().toLowerCase();
      if (!email || ids.has(user.id) || emails.has(email)) throw new Error(`${label} contains missing or duplicate identities; manual review required.`);
      ids.set(user.id, user); emails.set(email, user);
    }
    return { ids, emails };
  }
  const src = index(source, 'Source'), dst = index(destination, 'Destination');
  return [...src.ids.values()].map(user => {
    const email = user.email.trim().toLowerCase();
    const byId = dst.ids.get(user.id), byEmail = dst.emails.get(email);
    if (byId && byId.email.trim().toLowerCase() !== email) {
      return { source_id:user.id, destination_id:null, action:'uuid_collision_manual_review' };
    }
    if (byEmail) {
      return { source_id:user.id, destination_id:byEmail.id, action:
        user.email_confirmed_at && byEmail.email_confirmed_at
          ? 'verify_ownership_before_reusing_account'
          : 'unverified_email_manual_review' };
    }
    return { source_id:user.id, destination_id:null, action:'provision_auth_identity_then_record_destination_uuid' };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [sourcePath, destinationPath, outputPath] = process.argv.slice(2);
  if (!sourcePath || !destinationPath || !outputPath) {
    console.error('Usage: node scripts/plan-transfer.mjs SOURCE_USERS.json DESTINATION_USERS.json NEW_PLAN.json');
    process.exit(1);
  }
  const plan = planIdentities(JSON.parse(readFileSync(sourcePath,'utf8')), JSON.parse(readFileSync(destinationPath,'utf8')));
  writeFileSync(outputPath, JSON.stringify({ status:'REQUIRES_REVIEW_NOT_AN_IMPORT', users:plan }, null, 2)+'\n', {mode:0o600,flag:'wx'});
  console.log(`Prepared ${plan.length} identity decisions. No accounts or data were changed.`);
}
