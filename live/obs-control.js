'use strict';
// Talk to OBS through its built-in WebSocket server (OBS 28+: Tools > WebSocket Server Settings > Enable).
//   node obs-control.js stop | start | status
// OBS_WS_URL (default ws://127.0.0.1:4455) and OBS_WS_PASSWORD can be set in live/.env.
const crypto = require('crypto');
const path = require('path');
require('./lib/env').loadEnv(path.join(__dirname, '.env'));

const action = process.argv[2] || 'status';
const requestType = { stop: 'StopStream', start: 'StartStream', status: 'GetStreamStatus' }[action];
if (!requestType) { console.log('usage: node obs-control.js stop|start|status'); process.exit(1); }
const sha = (s) => crypto.createHash('sha256').update(s).digest('base64');

const ws = new WebSocket(process.env.OBS_WS_URL || 'ws://127.0.0.1:4455');
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.op === 0) { // Hello -> Identify (with auth if OBS asks for it)
    const d = { rpcVersion: 1 };
    if (m.d.authentication) d.authentication = sha(sha((process.env.OBS_WS_PASSWORD || '') + m.d.authentication.salt) + m.d.authentication.challenge);
    ws.send(JSON.stringify({ op: 1, d }));
  } else if (m.op === 2) { // Identified
    ws.send(JSON.stringify({ op: 6, d: { requestType, requestId: '1' } }));
  } else if (m.op === 7) { // RequestResponse
    const ok = m.d.requestStatus.result;
    console.log(`${requestType}: ${ok ? 'ok' : 'failed - ' + (m.d.requestStatus.comment || m.d.requestStatus.code)}${m.d.responseData ? ' ' + JSON.stringify(m.d.responseData) : ''}`);
    process.exit(ok ? 0 : 1);
  }
};
ws.onerror = () => { console.log('OBS WebSocket not reachable - enable it in OBS: Tools > WebSocket Server Settings'); process.exit(2); };
ws.onclose = (e) => { if (e.code === 4009) { console.log('OBS WebSocket password is wrong (set OBS_WS_PASSWORD in live/.env)'); process.exit(2); } };
setTimeout(() => { console.log('no answer from OBS'); process.exit(3); }, 10000);
