'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

// Voice providers (TTS_PROVIDER):
//   edge        free Microsoft Swara (hi-IN). Unofficial service: can break without notice.
//   azure       official Microsoft Speech, same Swara voice, SSML pauses/pitch per sentence. AZURE_SPEECH_KEY, AZURE_SPEECH_REGION
//   google      Google Cloud TTS (e.g. a hi-IN Chirp3-HD voice, very human). GOOGLE_TTS_KEY, GOOGLE_TTS_VOICE
//   elevenlabs  ElevenLabs multilingual (most expressive, paid). ELEVEN_API_KEY, ELEVEN_VOICE_ID
//   kokoro      Local Kokoro Hindi voice. KOKORO_VOICE (default: hf_beta), KOKORO_PYTHON
const DATA = process.env.LIVE_DATA_DIR || path.join(__dirname, '..', 'data');
const DIR = path.join(DATA, 'tts');
const VOICE = process.env.TTS_VOICE || 'hi-IN-SwaraNeural';
const KOKORO_VOICE = process.env.KOKORO_VOICE || 'hf_beta';
// soft, slow late-night streamer delivery (the worker varies this a little per sentence)
const KOKORO_SPEED = Number(process.env.KOKORO_SPEED || 0.9);
const KOKORO_STYLE = process.env.KOKORO_STYLE || 'soft';
fs.mkdirSync(DIR, { recursive: true });

const provider = () => (process.env.TTS_PROVIDER || 'edge').toLowerCase();
const xml = (s) => s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));

// Split a line into sentences so each one gets its own delivery instead of one flat tone.
function segments(text) {
  const parts = text.match(/[^।.!?…]+(?:\.\.\.|…|[।.!?]+)?/g) || [text];
  return parts.map((s) => s.trim()).filter((s) => /[\p{L}\p{N}]/u.test(s));
}

// Excited lines faster and higher, questions rise, a trailing "..." slows down; plain lines alternate slightly.
function prosody(seg, i) {
  if (/!$/.test(seg)) return { rate: '+14%', pitch: '+9Hz' };
  if (/\?$/.test(seg)) return { rate: '+6%', pitch: '+14Hz' };
  if (/(\.\.\.|…)$/.test(seg)) return { rate: '-4%', pitch: '+0Hz' };
  return i % 2 ? { rate: '+4%', pitch: '+3Hz' } : { rate: '+9%', pitch: '-1Hz' };
}

function run(cmd, args, env) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { windowsHide: true, env: env || process.env });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(err.trim().split('\n').pop() || 'exit ' + code))));
  });
}

// Keep one Kokoro process alive. Reloading the model for every chat reply
// would make a live stream feel delayed after the first line.
let kokoroProcess = null;
let kokoroBuffer = '';
let kokoroSeq = 0;
const kokoroPending = new Map();

function failKokoro(err, processRef) {
  if (processRef && kokoroProcess !== processRef) return;
  const p = kokoroProcess;
  kokoroProcess = null;
  kokoroBuffer = '';
  for (const job of kokoroPending.values()) job.reject(err);
  kokoroPending.clear();
  if (p && !p.killed) p.kill();
}

function ensureKokoro() {
  if (kokoroProcess && !kokoroProcess.killed) return kokoroProcess;
  const python = process.env.KOKORO_PYTHON || process.env.PYTHON || 'python';
  const worker = path.join(__dirname, 'kokoro_worker.py');
  const p = spawn(python, [worker], {
    windowsHide: true,
    env: Object.assign({}, process.env, { PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' }),
  });
  kokoroProcess = p;
  p.stdout.setEncoding('utf8');
  p.stdout.on('data', (data) => {
    kokoroBuffer += data;
    const lines = kokoroBuffer.split(/\r?\n/);
    kokoroBuffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) continue;
      let result;
      try { result = JSON.parse(line); } catch (e) { continue; }
      const job = kokoroPending.get(result.id);
      if (!job) continue;
      kokoroPending.delete(result.id);
      if (result.ok) job.resolve();
      else job.reject(new Error(result.error || 'Kokoro synthesis failed'));
    }
  });
  p.stderr.on('data', (data) => console.log('[kokoro]', String(data).trim()));
  p.on('error', (err) => failKokoro(err, p));
  p.on('close', (code) => {
    if (kokoroProcess === p) failKokoro(new Error('Kokoro worker exited with code ' + code), p);
  });
  return p;
}

function synthWithKokoro(text, out) {
  const p = ensureKokoro();
  const id = String(++kokoroSeq);
  return new Promise((resolve, reject) => {
    kokoroPending.set(id, { resolve, reject });
    p.stdin.write(JSON.stringify({
      id, text, voice: KOKORO_VOICE,
      speed: Number.isFinite(KOKORO_SPEED) ? KOKORO_SPEED : 0.9,
      style: KOKORO_STYLE,
      output: out,
    }) + '\n');
  });
}

// edge-tts is a Python tool; look on PATH first, then in the usual Windows Python install folders.
function edgeCandidates() {
  const c = [];
  if (process.env.EDGE_TTS_BIN) c.push(process.env.EDGE_TTS_BIN);
  c.push('edge-tts');
  const base = process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs', 'Python');
  try { for (const d of fs.readdirSync(base)) c.push(path.join(base, d, 'Scripts', 'edge-tts.exe')); } catch (e) { /* no Python folder */ }
  return c;
}

async function edgeSegment(text, p, out) {
  const txt = out + '.txt';
  fs.writeFileSync(txt, text, 'utf8');
  const args = ['--voice', VOICE, '--rate=' + p.rate, '--pitch=' + p.pitch, '--file', txt, '--write-media', out];
  try {
    for (const bin of edgeCandidates()) {
      try { return await run(bin, args); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    }
    throw new Error('edge-tts not found (run: pip install -U edge-tts)');
  } finally {
    fs.rmSync(txt, { force: true });
  }
}

// One clip per sentence, then joined (MP3 frames concatenate cleanly; each clip carries its own short pause).
async function viaEdge(text, out) {
  const segs = segments(text);
  const parts = segs.map((_, i) => `${out}.${i}.mp3`);
  try {
    // two at a time: fast enough, without spiking the CPU while OBS + the game are running
    for (let i = 0; i < segs.length; i += 2) {
      await Promise.all(segs.slice(i, i + 2).map((s, k) => edgeSegment(s, prosody(s, i + k), parts[i + k])));
    }
    fs.writeFileSync(out, Buffer.concat(parts.map((f) => fs.readFileSync(f))));
  } finally {
    parts.forEach((f) => fs.rmSync(f, { force: true }));
  }
}

// Local Kokoro synthesis: the persistent worker writes a native 24 kHz WAV.
async function viaKokoro(text, out) {
  await synthWithKokoro(text, out);
}

async function viaAzure(text, out) {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION || 'centralindia';
  if (!key) throw new Error('AZURE_SPEECH_KEY not set');
  const body = segments(text).map((s, i) => {
    const p = prosody(s, i);
    return `<prosody rate="${p.rate}" pitch="${p.pitch}">${xml(s)}</prosody><break time="${/[!?]$/.test(s) ? 220 : 160}ms"/>`;
  }).join('');
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="hi-IN"><voice name="${VOICE}">${body}</voice></speak>`;
  const r = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'stack3d-live' },
    body: ssml,
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error('Azure TTS HTTP ' + r.status);
  fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
}

async function viaGoogle(text, out) {
  const key = process.env.GOOGLE_TTS_KEY;
  const voice = process.env.GOOGLE_TTS_VOICE;
  if (!key || !voice) throw new Error('GOOGLE_TTS_KEY / GOOGLE_TTS_VOICE not set');
  const r = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: { text }, voice: { languageCode: voice.split('-').slice(0, 2).join('-'), name: voice }, audioConfig: { audioEncoding: 'MP3', speakingRate: 1.05 } }),
    signal: AbortSignal.timeout(15000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.audioContent) throw new Error('Google TTS HTTP ' + r.status + ' ' + ((j.error && j.error.message) || ''));
  fs.writeFileSync(out, Buffer.from(j.audioContent, 'base64'));
}

async function viaEleven(text, out) {
  const key = process.env.ELEVEN_API_KEY;
  const voice = process.env.ELEVEN_VOICE_ID;
  if (!key || !voice) throw new Error('ELEVEN_API_KEY / ELEVEN_VOICE_ID not set');
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: process.env.ELEVEN_MODEL || 'eleven_multilingual_v2', voice_settings: { stability: 0.35, similarity_boost: 0.8, style: 0.45, use_speaker_boost: true } }),
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error('ElevenLabs HTTP ' + r.status);
  fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
}

const PROVIDERS = { kokoro: viaKokoro, edge: viaEdge, azure: viaAzure, google: viaGoogle, elevenlabs: viaEleven };

// Cache file for a line. voiceKey is part of the key, so changing the Kokoro voice/speed/style regenerates the clips.
function clipFor(text) {
  const p = provider();
  const voiceKey = p === 'kokoro' ? KOKORO_VOICE + '|' + KOKORO_SPEED + '|' + KOKORO_STYLE + '|w3' : VOICE;
  const ext = p === 'kokoro' ? '.wav' : '.mp3';
  const id = crypto.createHash('sha1').update('v2|' + p + '|' + voiceKey + '|' + (process.env.GOOGLE_TTS_VOICE || '') + (process.env.ELEVEN_VOICE_ID || '') + '|' + text).digest('hex').slice(0, 20);
  return { p, id, ext, file: path.join(DIR, id + ext) };
}
const isCached = (text) => { const f = clipFor(text).file; return fs.existsSync(f) && fs.statSync(f).size >= 1000; };

// Same text + voice -> same cached file, so repeated lines cost nothing and sound identical.
async function synth(text) {
  const { p, id, ext, file } = clipFor(text);
  const estMs = Math.max(2500, text.length * 80);
  if (inflight.has(file)) return inflight.get(file); // already being made (e.g. prepared ahead): share that job
  if (fs.existsSync(file) && fs.statSync(file).size >= 1000) return { url: '/tts/' + id + ext, estMs };
  const job = (PROVIDERS[p] || viaEdge)(text, file)
    .then(() => ({ url: '/tts/' + id + ext, estMs }))
    .catch((e) => {
      fs.rmSync(file, { force: true });
      console.log('[tts] failed (' + p + '):', e.message);
      return { url: null, estMs };
    })
    .finally(() => inflight.delete(file));
  inflight.set(file, job);
  return job;
}
const inflight = new Map();

// Load the voice model now (Kokoro ~50s once) with a throw-away line, even when every line is already cached,
// so the first live comment reply is not stuck behind the model load.
async function warm() {
  if (provider() !== 'kokoro') return synth('नमस्ते।');
  const tmp = path.join(DIR, 'warmup-' + process.pid + '.wav');
  try { await synthWithKokoro('नमस्ते।', tmp); return { url: 'warm' }; } catch (e) { console.log('[tts] warm-up failed:', e.message); return { url: null }; } finally { fs.rmSync(tmp, { force: true }); }
}

module.exports = { synth, warm, isCached, busy: () => inflight.size > 0, DIR, segments };
