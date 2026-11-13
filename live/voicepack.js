'use strict';
// Pre-records every fixed host line (play-by-play, small talk, chat prompts, support asks, game moments) with the
// current voice settings, so the stream can talk continuously even though Kokoro is slower than real time on CPU.
// Run once before streaming (and again after changing KOKORO_VOICE / KOKORO_SPEED):   npm run voicepack
const path = require('path');
require('./lib/env').loadEnv(path.join(__dirname, '.env'));
const brain = require('./lib/brain');
const tts = require('./lib/tts');

(async () => {
  const lines = brain.staticLines();
  const t0 = Date.now();
  let made = 0;
  let failed = 0;
  for (let i = 0; i < lines.length; i++) {
    if (tts.isCached(lines[i])) continue;
    const r = await tts.synth(lines[i]);
    if (r.url) made += 1; else failed += 1;
    console.log(`[${i + 1}/${lines.length}] ${r.url ? 'ok    ' : 'FAILED'} ${lines[i].slice(0, 50)}`);
  }
  console.log(`voice pack: ${lines.length} lines, ${made} newly recorded, ${failed} failed, ${Math.round((Date.now() - t0) / 1000)}s`);
  process.exit(failed ? 1 : 0);
})();
