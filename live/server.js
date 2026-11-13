'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

require('./lib/env').loadEnv(path.join(__dirname, '.env'));
const QRCode = require('qrcode');
const store = require('./lib/store');
const tts = require('./lib/tts');
const brain = require('./lib/brain');
const razorpay = require('./lib/razorpay');
const youtube = require('./lib/youtube');

const MOCK = process.argv.includes('--mock') || process.env.MOCK === '1';
const ALLOW_TEST = MOCK || process.env.ALLOW_TEST === '1';
const PORT = Number(process.env.PORT || 8787);
const ROOT = path.join(__dirname, '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toTimeString().slice(0, 8), ...a);

let game = { level: 1, attempt: 1, score: 0, bestLevel: 1, gems: 0 };
let qrDataUrl = null;
let payUrl = '';
let lastChatAt = Date.now();
let voiceReady = false;
const MIN = 60000;

// ---------------- SSE hub ----------------
const clients = new Set();
function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(msg);
}
const supportersPayload = () => store.topSupporters(3).map((s) => ({ name: s.name, total: s.total }));

// ---------------- speaking queue ----------------
const PRIO = { donation: 0, chat: 1, shout: 2, game: 3, promo: 3, idle: 4 };
const MAX_AGE = { donation: Infinity, chat: 120000, shout: 90000, game: 12000, promo: 60000, idle: 30000 };
const queue = [];
const waiters = new Map();
let speaking = false;
let lastSpokeAt = Date.now();
let lastGameAt = 0;

function say(kind, text, extra) {
  if (!text) return;
  if (!(extra && extra.presoft)) text = brain.soft(text); // calm, close-mic delivery for every line
  if (kind === 'game') {
    if (queue.some((q) => q.kind === 'game') || Date.now() - lastGameAt < 9000) return;
    lastGameAt = Date.now();
  }
  queue.push({ kind, text, extra: extra || {}, ts: Date.now(), prio: PRIO[kind] });
  queue.sort((a, b) => a.prio - b.prio || a.ts - b.ts);
  pump();
}

async function pump() {
  if (speaking) return;
  let item = null;
  while (queue.length) {
    const c = queue.shift();
    if (Date.now() - c.ts <= MAX_AGE[c.kind]) { item = c; break; }
  }
  if (!item) return;
  // A reply that still has to be generated (slow on CPU): bridge with a short pre-recorded line, like a streamer
  // saying "hmm, let me see..." while reading chat. Donations are never delayed by this; each item waits at most once.
  if (clients.size && !item.bridged && item.kind !== 'donation' && !tts.isCached(item.text)) {
    const filler = nextIdleText();
    if (tts.isCached(filler)) {
      item.bridged = true;
      tts.synth(item.text).catch(() => {});
      queue.unshift(item);
      item = { kind: 'idle', text: filler, extra: { presoft: true }, ts: Date.now(), prio: PRIO.idle };
    }
  }
  speaking = true;
  try {
    const clip = await tts.synth(item.text);
    const id = crypto.randomBytes(6).toString('hex');
    const durMs = clip.estMs + 4000;
    log(`[say:${item.kind}]`, item.text);
    broadcast('say', Object.assign({ id, text: item.text, audio: clip.url, kind: item.kind, durMs }, item.extra));
    // while this line plays, get the next one's audio ready so the talk flows without gaps
    if (queue.length) tts.synth(queue[0].text).catch(() => {});
    else prepareIdle();
    if (clients.size) {
      await new Promise((resolve) => {
        const t = setTimeout(resolve, durMs + 8000);
        waiters.set(id, () => { clearTimeout(t); resolve(); });
      });
      waiters.delete(id);
    } else {
      await sleep(500);
    }
  } catch (e) {
    log('[speak] error:', e.message);
  } finally {
    speaking = false;
    lastSpokeAt = Date.now();
    setTimeout(pump, 350);
  }
}

// ---------------- chat ----------------
const chatBuf = [];
const lastText = new Map();
const lastReplyTo = new Map();
let lastChatReplyAt = 0;
let picking = false;

function sanitizeComment(t) {
  const s = String(t || '').replace(/https?:\/\/\S+|www\.\S+/gi, '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
  if (s.length < 2 || /(.)\1{9,}/.test(s) || !/[\p{L}\p{N}]/u.test(s)) return '';
  return s;
}

function onChat(m) {
  const text = sanitizeComment(m.text);
  if (!text) return;
  const author = store.cleanName(m.author);
  const dupKey = author.toLowerCase() + '|' + text.toLowerCase();
  if (Date.now() - (lastText.get(dupKey) || 0) < 60000) return; // same person repeating the same text: ignore
  lastText.set(dupKey, Date.now());
  store.recordChat(author);
  lastChatAt = Date.now();
  chatBuf.push({ author, text, isMember: m.isMember, isMod: m.isMod || m.isOwner, ts: Date.now() });
  broadcast('chat', { author, text, member: Boolean(m.isMember) });
  if (chatBuf.length > 60) chatBuf.shift();
}

function chatScore(m) {
  let s = 0;
  if (store.isSupporter(m.author)) s += 50;
  if (m.isMember) s += 20;
  if (m.isMod) s += 5;
  if (m.text.includes('?')) s += 8;
  s += Math.min(m.text.length, 60) / 20;
  s -= (Date.now() - m.ts) / 30000;
  const last = lastReplyTo.get(m.author.toLowerCase());
  if (last && Date.now() - last < 90000) s -= 100;
  return s;
}

async function pickChat() {
  if (picking || Date.now() - lastChatReplyAt < 8000 || queue.some((q) => q.kind === 'chat')) return;
  while (chatBuf.length && Date.now() - chatBuf[0].ts > 180000) chatBuf.shift();
  if (!chatBuf.length) return;
  picking = true;
  try {
    let best = -1;
    let bestScore = -Infinity;
    chatBuf.forEach((m, i) => { const s = chatScore(m); if (s > bestScore) { bestScore = s; best = i; } });
    if (bestScore < -50) return;
    const m = chatBuf.splice(best, 1)[0];
    lastReplyTo.set(m.author.toLowerCase(), Date.now());
    lastChatReplyAt = Date.now();
    const count = store.chatCount(m.author);
    const line = brain.chatReply(m, { first: count <= 1, count, game });
    if (line) say('chat', line, { comment: { name: m.author, text: m.text } });
  } catch (e) {
    log('[chat] error:', e.message);
  } finally {
    picking = false;
  }
}

// ---------------- donations ----------------
async function onDonation(d) {
  if (d.id) {
    if (store.seen(d.id)) return;
    store.markSeen(d.id);
  }
  const name = store.cleanName(d.name);
  const amount = Math.max(0, Number(d.amount) || 0);
  const display = d.display || '₹' + amount;
  const res = store.addDonation({ name, amount, display });
  const message = brain.clean(sanitizeComment(d.message)) || '';
  const tier = brain.tierOf(amount);
  log(`[donation] ${name} ${display}`);
  const entry = { name, amount, display, message: message.slice(0, 90), tier, at: Date.now(), source: d.source || 'razorpay' };
  store.addRecent(entry);
  broadcast('donation', entry);
  broadcast('payments', store.recent(5));
  nextPromoAt = Math.max(nextPromoAt, Date.now() + promoCfg.after * MIN); // never ask right after someone has given
  const spoken = await brain.spokenName(name);
  const line = amount > 0
    ? brain.donationLine({ name: spoken, amount, message: message.slice(0, 90), returning: res.returning, tier })
    : `${spoken}, आपके सपोर्ट के लिए बहुत बहुत शुक्रिया!`;
  say('donation', line, { donation: { name, display, tier, message: message.slice(0, 90) } });
  broadcast('supporters', supportersPayload());
}

// Ask Razorpay's API directly. Retries network errors (busy PC / slow net) for ~30s; anything not
// "captured" with the exact same amount is never shown.
async function confirmWithApi(d) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const p = await razorpay.fetchPayment(d.id);
      if (p.status === 'captured' && Number(p.amount) === Number(d.paise)) return true;
      if (attempt === 3 || p.status !== 'authorized') {
        log('[razorpay] NOT shown:', d.id, 'API says status', p.status, 'amount', p.amount);
        return false;
      }
    } catch (e) {
      if (attempt === 3) { log('[razorpay] NOT shown: could not confirm', d.id, 'with the Razorpay API:', e.message); return false; }
    }
    await sleep(attempt * 4000);
  }
  return false;
}

// ---------------- game events ----------------
let lastFpsLog = 0;
function onGame(ev) {
  if (!ev || typeof ev.type !== 'string') return;
  if (ev.type === 'status') {
    gameStatus = { state: ev.state, progress: ev.progress, left: ev.left, combo: ev.combo, fire: ev.fire, ball: ev.ball, fps: ev.fps, quality: ev.quality };
    if (Date.now() - lastFpsLog > 60000) { lastFpsLog = Date.now(); log(`[game] ${ev.fps} fps, quality ${ev.quality}, level ${game.level}`); }
  }
  game = {
    level: ev.level || game.level,
    attempt: ev.attempt || game.attempt,
    score: ev.score !== undefined ? ev.score : game.score,
    bestLevel: ev.bestLevel || game.bestLevel,
    gems: ev.gems !== undefined ? ev.gems : game.gems,
  };
  // track "exciting" moments so support asks never interrupt them
  const now = Date.now();
  if (ev.type === 'level_start') { bossLevel = Boolean(ev.boss); excitedUntil = 0; }
  else if (ev.type === 'fireball') excitedUntil = Math.max(excitedUntil, now + 10000);
  else if (ev.type === 'combo') excitedUntil = Math.max(excitedUntil, now + 8000);
  else if (ev.type === 'checkpoint' && ev.pct >= 75) excitedUntil = Math.max(excitedUntil, now + 45000);
  else if (ev.type === 'level_clear' || ev.type === 'died') excitedUntil = now + 5000;
  const line = brain.gameLine(ev);
  if (line) say('game', line);
}

// ---------------- likes goal ladder ("let's complete our 100 likes") ----------------
const LIKE_GOALS = [10, 25, 50, 100, 200, 300, 500, 1000, 2000, 5000, 10000];
let likes = -1;
let announcedGoal = -1;
const currentGoal = () => LIKE_GOALS.find((g) => g > likes) || 0;
function onLikes(n) {
  if (!(n >= 0)) return;
  likes = n;
  const reached = [...LIKE_GOALS].reverse().find((g) => g <= n) || 0;
  if (announcedGoal < 0) { announcedGoal = reached; return; } // first reading: do not announce old goals
  if (reached > announcedGoal) { announcedGoal = reached; say('shout', brain.goalReached(reached)); }
}

// ---------------- scheduled talk ----------------
// Continuous commentary: when nothing else is queued she keeps talking (play-by-play from the live game
// state, mixed with chat prompts, predictions and small talk). Comments and payments always go first.
const GAP_MS = Number(process.env.COMMENTARY_GAP_SEC || 2) * 1000;
const QUIET_AFTER = MOCK ? 30000 : 60000;
let gameStatus = {};
let idleTurn = 0;
let prepared = null;
function rawIdleText() {
  idleTurn += 1;
  if (gameStatus.state !== 'playing' || idleTurn % 3 === 0) {
    return brain.nextIdle({ quiet: Date.now() - lastChatAt > QUIET_AFTER, likes, goal: currentGoal() }).text;
  }
  return brain.commentary(Object.assign({}, game, gameStatus));
}
// Prefer a line that is already recorded (voice pack) so there is no wait; otherwise use the first idea.
function nextIdleText() {
  let first = null;
  for (let tries = 0; tries < 6; tries++) {
    const t = brain.soft(rawIdleText());
    if (!first) first = t;
    if (tts.isCached(t)) return t;
  }
  return first;
}
function prepareIdle() {
  if (prepared) return;
  prepared = { text: nextIdleText(), at: Date.now() };
  tts.synth(prepared.text).catch(() => {});
}
setInterval(() => {
  if (speaking || queue.length || Date.now() - lastSpokeAt < GAP_MS) return;
  const text = prepared && Date.now() - prepared.at < 20000 ? prepared.text : nextIdleText();
  prepared = null;
  say('idle', text, { presoft: true });
}, 1000);

// Fill the voice pack in the background whenever the voice is idle (npm run voicepack does it all up front).
function startVoicePackWarmer() {
  const todo = brain.staticLines().filter((t) => !tts.isCached(t));
  if (!todo.length) { log('[info] voice pack complete: idle talk plays instantly'); return; }
  log(`[info] voice pack: ${todo.length} lines not recorded yet, recording in the background (or run: npm run voicepack)`);
  const timer = setInterval(() => {
    if (tts.busy() || queue.length) return;
    while (todo.length && tts.isCached(todo[0])) todo.shift();
    if (!todo.length) { clearInterval(timer); log('[info] voice pack complete'); return; }
    tts.synth(todo.shift()).catch(() => {});
  }, 1500);
}

// Gentle support asks: random 10-20 min apart (minutes, configurable), never during an exciting moment.
const promoCfg = {
  first: Number(process.env.PROMO_FIRST_MIN || (MOCK ? 0.4 : 5)),
  min: Number(process.env.PROMO_MIN || (MOCK ? 1 : 10)),
  max: Number(process.env.PROMO_MAX || (MOCK ? 1.5 : 20)),
  after: Number(process.env.PROMO_AFTER_DONATION_MIN || (MOCK ? 0.5 : 5)),
};
let nextPromoAt = Date.now() + promoCfg.first * MIN;
let excitedUntil = 0;
let bossLevel = false;
const exciting = () => bossLevel || Date.now() < excitedUntil;
function runPromo() {
  nextPromoAt = Date.now() + (promoCfg.min + Math.random() * (promoCfg.max - promoCfg.min)) * MIN;
  broadcast('promo', { ms: 25000 });
  say('promo', brain.promoLine());
  // put the tappable link in chat so phone viewers can pay on the same phone (pin it once in YouTube Studio too)
  if (payUrl && !MOCK) {
    youtube.postChat(`सहयोग करना चाहें तो, इसी फ़ोन से UPI द्वारा: ${payUrl.startsWith("upi:") ? "UPI ID " + payUrl.slice(13).split("&")[0] : payUrl}  (पूरी तरह आपकी मर्ज़ी)`)
      .then((ok) => ok && log('[youtube] support link posted in chat'))
      .catch((e) => log('[youtube] could not post the link in chat:', e.message));
  }
}
setInterval(() => {
  if (!payUrl || Date.now() < nextPromoAt || speaking || queue.length || exciting()) return;
  runPromo();
}, 3000);

setInterval(pickChat, 3000);

let lastRecap = Date.now();
setInterval(async () => {
  if (Date.now() - lastRecap < (MOCK ? 90000 : 10 * 60000)) return;
  lastRecap = Date.now();
  const sup = store.topSupporters(3);
  if (sup.length) say('shout', brain.recapSupporters(await Promise.all(sup.map((s) => brain.spokenName(s.name)))));
  const chat = store.topChatters(3, 3);
  if (chat.length >= 2) say('shout', brain.recapChatters(await Promise.all(chat.map((c) => brain.spokenName(c.name)))));
}, 15000);

let introDone = false;

// ---------------- HTTP ----------------
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function allowedStatic(p) {
  if (p.includes('..') || /\/\./.test(p)) return false;
  if (p.startsWith('/live/')) return p.startsWith('/live/assets/') || (p === '/live/test.html' && ALLOW_TEST);
  return /^\/[A-Za-z0-9_.-]+\.(html|css|js|png|svg|ico)$/.test(p);
}

function sendFile(req, res, file) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('not found'); }
    const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (range) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Math.min(Number(range[2]), st.size - 1) : st.size - 1;
      res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
}

function readBody(req, limit = 1e6) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let n = 0;
    req.on('data', (c) => { n += c.length; if (n > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  try {
    if (p === '/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      clients.add(res);
      req.on('close', () => clients.delete(res));
      res.write(`event: config\ndata: ${JSON.stringify({ qr: qrDataUrl, payUrl, payShort: payUrl.replace(/^https?:\/\/(www\.)?/, ''), mock: MOCK })}\n\n`);
      res.write(`event: supporters\ndata: ${JSON.stringify(supportersPayload())}\n\n`);
      res.write(`event: payments\ndata: ${JSON.stringify(store.recent(5))}\n\n`);
      if (!introDone) { introDone = true; setTimeout(() => say('shout', brain.intro()), 4000); }
      return;
    }
    if (p === '/game-event' && req.method === 'POST') {
      onGame(JSON.parse((await readBody(req)).toString() || '{}'));
      res.writeHead(204); return res.end();
    }
    if (p === '/said' && req.method === 'POST') {
      const w = waiters.get(url.searchParams.get('id'));
      if (w) w();
      res.writeHead(204); return res.end();
    }
    if (p === '/razorpay/webhook' && req.method === 'POST') {
      const raw = await readBody(req);
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
      if (!razorpay.verify(raw, req.headers['x-razorpay-signature'], secret)) {
        log('[razorpay] rejected: bad or missing signature');
        res.writeHead(400); return res.end('bad signature');
      }
      res.writeHead(200); res.end('ok'); // acknowledge fast; Razorpay retries otherwise
      let body = null;
      try { body = JSON.parse(raw.toString()); } catch (e) { return; }
      const d = razorpay.parse(body);
      if (!d) { log('[razorpay] ignored event', body.event, '- only confirmed (captured) payments are shown'); return; }
      if (razorpay.canVerify() && !(await confirmWithApi(d))) return;
      if (!d.name) log('[razorpay] payment had no name field. Note keys seen:', d.noteKeys.join(', ') || '(none)', '- set RAZORPAY_NAME_FIELD');
      onDonation({ id: d.id, name: d.name, amount: d.currency === 'INR' ? d.amount : 0, display: d.currency === 'INR' ? '' : `${d.amount} ${d.currency}`, message: d.message });
      return;
    }
    if (p.startsWith('/tts/')) {
      const f = path.join(tts.DIR, path.basename(p));
      return sendFile(req, res, f);
    }
    if (p === '/state') return json(res, 200, { voiceReady, youtube: { oauth: youtube.hasOAuth(), videoId: youtube.current.videoId }, game, fps: gameStatus.fps, queue: queue.length, exciting: exciting(), nextPromoInSec: Math.round((nextPromoAt - Date.now()) / 1000), recent: store.recent(5), supporters: store.topSupporters(10), chatters: store.topChatters(10, 1), mock: MOCK, qr: Boolean(qrDataUrl) });
    if (p.startsWith('/mock/') && req.method === 'POST' && ALLOW_TEST) {
      const b = JSON.parse((await readBody(req)).toString() || '{}');
      if (p === '/mock/comment') onChat({ author: b.author || 'Rahul', text: b.text || 'hello', isMember: Boolean(b.member) });
      else if (p === '/mock/donation') onDonation({ id: 'mock_' + Date.now(), name: b.name || 'Rahul', amount: Number(b.amount) || 51, message: b.message || '' });
      else if (p === '/mock/game') onGame(b);
      else if (p === '/mock/promo') runPromo();
      else { res.writeHead(404); return res.end(); }
      res.writeHead(204); return res.end();
    }
    if (req.method === 'GET' || req.method === 'HEAD') {
      const rel = p === '/' ? '/index.html' : p;
      if (allowedStatic(rel)) return sendFile(req, res, path.join(ROOT, rel));
      if (/^\/[A-Za-z0-9_.-]+\.mp4$/.test(rel)) { res.writeHead(404); return res.end(); }
    }
    res.writeHead(404); res.end('not found');
  } catch (e) {
    log('[http] error:', e.message);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
});

// ---------------- boot ----------------
async function main() {
  // UPI QR (any UPI app). RAZORPAY_PAY_URL, if set, wins; otherwise a plain upi:// link to UPI_ID.
  const upiId = process.env.UPI_ID || 'mulikprajyot41-1@okaxis';
  payUrl = process.env.RAZORPAY_PAY_URL || (upiId ? `upi://pay?pa=${upiId}&cu=INR` : '');
  if (payUrl) {
    const svg = await QRCode.toString(payUrl, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
    qrDataUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  } else {
    log('[warn] RAZORPAY_PAY_URL not set: QR shows DEMO and support asks are off');
  }
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) log('[warn] RAZORPAY_WEBHOOK_SECRET not set: real payments will be rejected');
  log(razorpay.canVerify() ? '[info] every payment is double-checked with the Razorpay API' : '[info] RAZORPAY_KEY_ID/SECRET not set: payments verified by webhook signature only');
  log('[info] voice provider:', process.env.TTS_PROVIDER || 'kokoro');
  // load the voice model now (Kokoro needs ~45s once), so the stream starts talking immediately
  const warmStart = Date.now();
  tts.warm().then((r) => {
    voiceReady = Boolean(r.url);
    log(r.url ? `[info] voice ready (${Math.round((Date.now() - warmStart) / 1000)}s)` : '[warn] voice failed to start, check the [tts] errors above');
    if (r.url) startVoicePackWarmer();
  });

  if (!MOCK && (youtube.hasOAuth() || (process.env.YT_API_KEY && (process.env.YT_VIDEO_ID || process.env.YT_CHANNEL_ID)))) {
    if (youtube.hasOAuth()) youtube.selfTest().then((m) => log('[youtube]', m)).catch((e) => log('[youtube] OAuth problem:', e.message));
    youtube.start({
      onChat: onChat,
      onSuperChat: (d) => onDonation(Object.assign({ display: d.display, source: 'superchat' }, d)),
      onMember: (name) => onDonation({ id: 'member_' + Date.now(), name, amount: 0, display: 'MEMBER', source: 'member' }),
      log,
    }).catch((e) => log('[youtube] stopped:', e.message));
    youtube.pollStats({ onStats: (s) => onLikes(s.likes), log });
  } else if (!MOCK) {
    log('[info] YouTube not configured (OAuth, or YT_API_KEY + YT_VIDEO_ID): not reading chat');
  }

  if (MOCK) startMock();

  server.listen(PORT, '127.0.0.1', () => {
    log(`Overlay + game:  http://localhost:${PORT}/?live=1`);
    if (ALLOW_TEST) log(`Test panel:      http://localhost:${PORT}/live/test.html`);
  });
}

function startMock() {
  const names = ['Rahul', 'Priya_gamer', 'Aman Singh', 'Sneha', 'Vikas', 'Neha Sharma', 'Rohit'];
  const comments = ['Hi didi, Delhi se', 'kitna level jayega ye bot?', 'Bhai ye bot toh pro hai', 'Namaste Riya ji', 'Boss level aaya, mar jayega', 'Superb game, satisfying', 'I think level 10', 'आवाज़ बहुत अच्छी है', 'Are you real?', 'Pehla comment!', 'kitne gems hue ab?'];
  onLikes(7);
  setInterval(() => onLikes(likes + 1 + Math.floor(Math.random() * 4)), 12000);
  let i = 0;
  setInterval(() => { onChat({ author: names[i % names.length], text: comments[i % comments.length] }); i++; }, 9000);
  const donors = [['Rahul', 101, 'Keep going!'], ['Priya_gamer', 51, ''], ['Aman Singh', 501, 'Love this stream'], ['Sneha', 201, '']];
  let d = 0;
  setTimeout(function next() {
    const x = donors[d++ % donors.length];
    onDonation({ id: 'mock_' + Date.now(), name: x[0], amount: x[1], message: x[2] });
    setTimeout(next, 70000);
  }, 25000);
}

process.on('unhandledRejection', (e) => log('[unhandled]', e && e.message ? e.message : e));
main();
