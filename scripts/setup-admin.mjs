import https from 'https';
import fs from 'fs';
import path from 'path';
import os from 'os';

const credPath = path.join(os.homedir(), '.claude', '.credentials.json');
const creds = JSON.parse(fs.readFileSync(credPath, 'utf8'));
const sbToken = creds.supabase.accessToken;
const projectRef = 'nfmgmyjkazcamgetxwhk';

function httpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  // 1. Get API keys
  console.log('1. Getting API keys...');
  const keysRes = await httpRequest({
    hostname: 'api.supabase.com',
    path: `/v1/projects/${projectRef}/api-keys`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${sbToken}` }
  });
  const keys = JSON.parse(keysRes.body);
  const anonKey = keys.find(k => k.name === 'anon').api_key;
  const serviceKey = keys.find(k => k.name === 'service_role').api_key;
  console.log('  anon key:', anonKey.substring(0, 20) + '...');
  console.log('  service_role key:', serviceKey.substring(0, 20) + '...');

  // 2. Create admin user
  console.log('2. Creating admin user...');
  const userData = JSON.stringify({
    email: 'admin@hireflow.jp',
    password: 'HireFlow2026Admin!',
    email_confirm: true
  });
  const userRes = await httpRequest({
    hostname: `${projectRef}.supabase.co`,
    path: '/auth/v1/admin/users',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(userData)
    }
  }, userData);

  if (userRes.status === 200 || userRes.status === 201) {
    const user = JSON.parse(userRes.body);
    console.log('  User created:', user.id);

    // 3. Insert organization_members record
    console.log('3. Creating organization member...');
    const memberSql = `INSERT INTO organization_members (org_id, auth_user_id, role, display_name, email)
      VALUES ('00000000-0000-0000-0000-000000000001', '${user.id}', 'admin', 'Admin', 'admin@hireflow.jp')
      ON CONFLICT (org_id, auth_user_id) DO NOTHING;`;

    const memberData = JSON.stringify({ query: memberSql });
    const memberRes = await httpRequest({
      hostname: 'api.supabase.com',
      path: `/v1/projects/${projectRef}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sbToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(memberData)
      }
    }, memberData);
    console.log('  Member insert status:', memberRes.status);

    // 4. Output env vars
    console.log('\n=== .env.local ===');
    console.log(`NEXT_PUBLIC_SUPABASE_URL=https://${projectRef}.supabase.co`);
    console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`);
    console.log(`SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`);
    console.log('ANTHROPIC_API_KEY=<SET_MANUALLY>');
    console.log('APP_BASE_URL=<SET_AFTER_DEPLOY>');

    // Save keys to temp file for automation
    fs.writeFileSync(path.join(os.homedir(), '.claude', '.hireflow-keys.json'), JSON.stringify({
      projectRef,
      supabaseUrl: `https://${projectRef}.supabase.co`,
      anonKey,
      serviceKey,
      adminUserId: user.id
    }, null, 2));
    console.log('\nKeys saved to ~/.claude/.hireflow-keys.json');
  } else {
    console.log('  Error:', userRes.status, userRes.body);
  }
}

main().catch(console.error);
