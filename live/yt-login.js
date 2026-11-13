'use strict';
// One-time YouTube login:  npm run yt-login
// Opens Google sign-in in your browser, then saves a fresh YT_REFRESH_TOKEN (and YT_CHANNEL_ID) into live/.env.
// Tip: in Google Cloud Console set the OAuth consent screen to "In production"; in "Testing" Google expires the
// token after 7 days and the daily stream would stop reading chat.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const ENV = path.join(__dirname, '.env');
require('./lib/env').loadEnv(ENV);
const raw = JSON.parse(process.env.YOUTUBE_OAUTH_CLIENT_JSON || '{}');
const client = raw.installed || raw.web;
if (!client) { console.error('YOUTUBE_OAUTH_CLIENT_JSON is missing in live/.env'); process.exit(1); }

const verifier = crypto.randomBytes(48).toString('base64url');
const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
const state = crypto.randomBytes(16).toString('hex');

function setEnv(key, value) {
  let text = fs.readFileSync(ENV, 'utf8');
  const line = key + '=' + value;
  text = new RegExp('^' + key + '=.*$', 'm').test(text) ? text.replace(new RegExp('^' + key + '=.*$', 'm'), line) : text.replace(/\n*$/, '\n') + line + '\n';
  fs.writeFileSync(ENV, text);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (!url.searchParams.get('code') && !url.searchParams.get('error')) { res.writeHead(404); return res.end(); }
  if (url.searchParams.get('state') !== state || url.searchParams.get('error')) {
    res.end('Login failed or cancelled. You can close this tab.');
    console.error('Login failed:', url.searchParams.get('error') || 'state mismatch');
    process.exit(1);
  }
  try {
    const body = new URLSearchParams({
      code: url.searchParams.get('code'), client_id: client.client_id, client_secret: client.client_secret,
      redirect_uri: redirect, grant_type: 'authorization_code', code_verifier: verifier,
    });
    const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body });
    const j = await r.json();
    if (!j.refresh_token) throw new Error(j.error_description || j.error || 'no refresh token returned');
    setEnv('YT_REFRESH_TOKEN', j.refresh_token);
    const ch = await (await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', { headers: { Authorization: 'Bearer ' + j.access_token } })).json();
    const c = ch.items && ch.items[0];
    if (c) setEnv('YT_CHANNEL_ID', c.id);
    res.end('Done! YouTube is connected. You can close this tab.');
    console.log(`Saved to live/.env. Channel: ${c ? c.snippet.title : '(unknown)'}`);
    process.exit(0);
  } catch (e) {
    res.end('Something went wrong: ' + e.message);
    console.error('Login failed:', e.message);
    process.exit(1);
  }
});

let redirect = '';
server.listen(0, '127.0.0.1', () => {
  redirect = `http://localhost:${server.address().port}`;
  const auth = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: client.client_id, redirect_uri: redirect, response_type: 'code', access_type: 'offline', prompt: 'consent',
    scope: 'https://www.googleapis.com/auth/youtube.force-ssl', code_challenge: challenge, code_challenge_method: 'S256', state,
  });
  console.log('Opening Google sign-in in your browser. If it does not open, paste this URL into the browser:\n' + auth);
  spawn('cmd', ['/c', 'start', '', auth.replace(/&/g, '^&')], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
});
setTimeout(() => { console.error('Timed out waiting for the browser login (5 min).'); process.exit(1); }, 5 * 60000);
