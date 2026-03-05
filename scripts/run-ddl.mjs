import https from 'https';
import fs from 'fs';
import path from 'path';
import os from 'os';

const credPath = path.join(os.homedir(), '.claude', '.credentials.json');
const creds = JSON.parse(fs.readFileSync(credPath, 'utf8'));
const token = creds.supabase.accessToken;
const projectRef = 'nfmgmyjkazcamgetxwhk';

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error('Usage: node run-ddl.mjs <sql-file>');
  process.exit(1);
}

const sql = fs.readFileSync(sqlFile, 'utf8');
const data = JSON.stringify({ query: sql });

const req = https.request({
  hostname: 'api.supabase.com',
  path: `/v1/projects/${projectRef}/database/query`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    if (res.statusCode !== 201) {
      console.log('Error:', body.substring(0, 1000));
    } else {
      console.log('SQL executed successfully');
    }
  });
});
req.write(data);
req.end();
