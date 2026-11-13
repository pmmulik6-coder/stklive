'use strict';
const fs = require('fs');
const path = require('path');

const DIR = process.env.LIVE_DATA_DIR || path.join(__dirname, '..', 'data');
const FILE = path.join(DIR, 'store.json');
let db = { supporters: {}, seen: [], translit: {}, recent: [] };
try { db = Object.assign(db, JSON.parse(fs.readFileSync(FILE, 'utf8'))); } catch (e) { /* first run */ }

const session = { supporters: {}, chatters: {} };
const key = (n) => String(n).trim().toLowerCase();
const blocked = (process.env.BLOCKED_WORDS || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);

let timer = null;
function persist() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      fs.mkdirSync(DIR, { recursive: true });
      fs.writeFileSync(FILE, JSON.stringify(db));
    } catch (e) { /* disk issue must never stop the stream */ }
  }, 800);
}

// Display names are shown on stream and read aloud: strip links, phone-like numbers and control chars.
function cleanName(raw) {
  let n = String(raw || '').normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[@<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (n.replace(/\D/g, '').length >= 7) n = '';
  n = n.slice(0, 20).trim();
  if (blocked.some((w) => n.toLowerCase().includes(w))) n = '';
  return n || 'Dost';
}

function addDonation({ name, amount, display }) {
  const k = key(name);
  const all = db.supporters[k] || (db.supporters[k] = { name, total: 0, count: 0 });
  all.total += amount;
  all.count += 1;
  const s = session.supporters[k] || (session.supporters[k] = { name, total: 0, count: 0, display: '' });
  s.total += amount;
  s.count += 1;
  s.display = display || '';
  persist();
  return { returning: all.count > 1, total: all.total };
}

const sortTop = (obj, n) => Object.values(obj).sort((a, b) => b.total - a.total).slice(0, n);

function recordChat(author) {
  const k = key(author);
  const c = session.chatters[k] || (session.chatters[k] = { name: author, total: 0 });
  c.total += 1;
}

const api = {
  cleanName,
  addDonation,
  recordChat,
  // confirmed payments, newest first (kept across restarts so the on-screen history never resets mid-stream)
  addRecent: (p) => { db.recent = [p].concat(db.recent || []).slice(0, 20); persist(); },
  recent: (n) => (db.recent || []).slice(0, n),
  chatCount: (author) => (session.chatters[key(author)] || { total: 0 }).total,
  topSupporters: (n) => sortTop(session.supporters, n),
  topChatters: (n, min) => sortTop(session.chatters, 20).filter((c) => c.total >= min).slice(0, n),
  isSupporter: (name) => Boolean(db.supporters[key(name)]),
  seen: (id) => db.seen.includes(id),
  markSeen: (id) => { db.seen.push(id); if (db.seen.length > 500) db.seen.shift(); persist(); },
  getTranslit: (name) => db.translit[key(name)],
  setTranslit: (name, v) => { db.translit[key(name)] = v; persist(); },
};

module.exports = api;
