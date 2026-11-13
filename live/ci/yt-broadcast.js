'use strict';
// Creates a fresh YouTube live broadcast for this run and binds it to a stream key, so YouTube always has
// something to put the video into (a broadcast that auto-stopped yesterday can't be reused).
// Prints two lines on stdout:  KEY=<stream key>  and  VIDEO=<broadcast id>
// Uses the stream whose key equals YT_STREAM_KEY if it exists on the channel; otherwise one titled "stklive"
// (created the first time).  Env: YOUTUBE_OAUTH_CLIENT_JSON, YT_REFRESH_TOKEN, STREAM_TITLE, STREAM_PRIVACY.
const API = 'https://www.googleapis.com/youtube/v3';

async function token() {
  const raw = JSON.parse(process.env.YOUTUBE_OAUTH_CLIENT_JSON);
  const c = raw.installed || raw.web || raw;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({ client_id: c.client_id, client_secret: c.client_secret, refresh_token: process.env.YT_REFRESH_TOKEN, grant_type: 'refresh_token' }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('OAuth failed: ' + (j.error_description || j.error));
  return j.access_token;
}

(async () => {
  const auth = { Authorization: 'Bearer ' + (await token()) };
  const api = async (pathQ, body) => {
    const r = await fetch(API + pathQ, { method: body ? 'POST' : 'GET', headers: Object.assign({ 'Content-Type': 'application/json' }, auth), body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(pathQ.split('?')[0] + ': ' + ((j.error && j.error.message) || r.status));
    return j;
  };

  // 1) pick the stream (= stream key)
  let streams = [];
  let page = '';
  do {
    const j = await api(`/liveStreams?part=id,snippet,cdn&mine=true&maxResults=50${page ? '&pageToken=' + page : ''}`);
    streams = streams.concat(j.items || []);
    page = j.nextPageToken || '';
  } while (page);
  const want = process.env.YT_STREAM_KEY || '';
  let stream = streams.find((s) => s.cdn && s.cdn.ingestionInfo && s.cdn.ingestionInfo.streamName === want)
    || streams.find((s) => s.snippet && s.snippet.title === 'stklive');
  if (!stream) {
    stream = await api('/liveStreams?part=snippet,cdn,contentDetails', {
      snippet: { title: 'stklive' },
      cdn: { frameRate: 'variable', ingestionType: 'rtmp', resolution: 'variable' },
      contentDetails: { isReusable: true },
    });
    console.error('[yt] created a reusable stream key "stklive"');
  }
  const key = stream.cdn.ingestionInfo.streamName;

  // 2) new broadcast that starts by itself when video arrives and ends when it stops
  const start = new Date(Date.now() + 60000).toISOString();
  const b = await api('/liveBroadcasts?part=snippet,status,contentDetails', {
    snippet: {
      title: (process.env.STREAM_TITLE || 'Stack Ball 3D LIVE | Hindi commentary').slice(0, 100),
      description: ((process.env.STREAM_DESCRIPTION || 'Stack Ball 3D live gameplay').trim() + '\n\n'
        + 'Support (optional): UPI ' + (process.env.UPI_ID || 'mulikprajyot41-1@okaxis') + '\n'
        + 'Note: game on auto-play, commentary voice is AI-generated.').slice(0, 5000),
      scheduledStartTime: start,
    },
    status: { privacyStatus: process.env.STREAM_PRIVACY || 'public', selfDeclaredMadeForKids: false },
    contentDetails: { enableAutoStart: true, enableAutoStop: true, enableDvr: true, latencyPreference: 'low', monitorStream: { enableMonitorStream: false } },
  });
  // YouTube's "altered or synthetic content" label (the voice is synthetic); best effort, never blocks the stream
  await fetch(API + '/videos?part=status', { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, auth),
    body: JSON.stringify({ id: b.id, status: { privacyStatus: process.env.STREAM_PRIVACY || 'public', selfDeclaredMadeForKids: false, containsSyntheticMedia: true } }) })
    .then((r) => console.error('[yt] synthetic-media label:', r.ok ? 'set' : 'HTTP ' + r.status)).catch(() => {});
  await api(`/liveBroadcasts/bind?id=${b.id}&part=id,contentDetails&streamId=${stream.id}`, {});
  console.error(`[yt] broadcast ${b.id} created and bound (stream "${stream.snippet.title}")`);
  console.log('KEY=' + key);
  console.log('VIDEO=' + b.id);
})().catch((e) => { console.error('[yt] ' + e.message); process.exit(1); });
