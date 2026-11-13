'use strict';
// YouTube live chat + likes.
//  - With OAuth (YOUTUBE_OAUTH_CLIENT_JSON + YT_REFRESH_TOKEN): finds YOUR active live broadcast by itself every day
//    (no video id needed), reads chat, and can post a message (e.g. the support link) into the chat.
//  - Without OAuth: needs YT_API_KEY + YT_VIDEO_ID (read-only).

const API = 'https://www.googleapis.com/youtube/v3';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const current = { videoId: '', chatId: '' };

// OAuth is turned off for this run if Google rejects the refresh token (expired/revoked): we fall back to the API key.
let oauthDead = false;
const hasOAuth = () => Boolean(process.env.YOUTUBE_OAUTH_CLIENT_JSON && process.env.YT_REFRESH_TOKEN) && !oauthDead;
let token = '';
let tokenExp = 0;
async function accessToken() {
  if (token && Date.now() < tokenExp) return token;
  const raw = JSON.parse(process.env.YOUTUBE_OAUTH_CLIENT_JSON);
  const c = raw.installed || raw.web || raw;
  const body = new URLSearchParams({ client_id: c.client_id, client_secret: c.client_secret, refresh_token: process.env.YT_REFRESH_TOKEN, grant_type: 'refresh_token' });
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body, signal: AbortSignal.timeout(15000) });
  const j = await r.json().catch(() => ({}));
  if (j.error === 'invalid_grant' && process.env.YT_API_KEY) oauthDead = true;
  if (!r.ok || !j.access_token) throw new Error('OAuth: ' + (j.error_description || j.error || 'HTTP ' + r.status) + (oauthDead ? ' (run: npm run yt-login). Using the API key instead.' : ''));
  token = j.access_token;
  tokenExp = Date.now() + (Number(j.expires_in || 3600) - 120) * 1000;
  return token;
}

async function api(pathAndQuery, opts = {}) {
  const headers = { Accept: 'application/json' };
  let url = API + pathAndQuery;
  if (hasOAuth()) headers.Authorization = 'Bearer ' + (await accessToken());
  else url += (url.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(process.env.YT_API_KEY || '');
  if (opts.body) headers['Content-Type'] = 'application/json';
  const r = await fetch(url, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined, signal: AbortSignal.timeout(15000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error((j.error && j.error.message) || 'HTTP ' + r.status);
    e.status = r.status;
    e.reason = j.error && j.error.errors && j.error.errors[0] && j.error.errors[0].reason;
    if (r.status === 401) tokenExp = 0;
    throw e;
  }
  return j;
}

// Today's live chat: from the fixed video id, or (OAuth) from the channel's active broadcast.
async function findChat(log) {
  for (;;) {
    try {
      if (!hasOAuth()) {
        // API key mode: a fixed video id, or today's live video on YT_CHANNEL_ID (search costs 100 quota, so check every 5 min)
        let videoId = process.env.YT_VIDEO_ID;
        if (!videoId && process.env.YT_CHANNEL_ID) {
          const s = await api(`/search?part=id&channelId=${encodeURIComponent(process.env.YT_CHANNEL_ID)}&eventType=live&type=video&maxResults=1`);
          videoId = s.items && s.items[0] && s.items[0].id && s.items[0].id.videoId;
        }
        if (videoId) {
          const v = await api(`/videos?part=liveStreamingDetails&id=${encodeURIComponent(videoId)}`);
          const chatId = v.items && v.items[0] && v.items[0].liveStreamingDetails && v.items[0].liveStreamingDetails.activeLiveChatId;
          if (chatId) return { videoId, chatId };
        }
        log('[youtube] no live video with chat found yet (API key mode) - checking again in 5 min');
        await sleep(270000);
      } else {
        const b = await api('/liveBroadcasts?part=snippet&broadcastStatus=active&broadcastType=all&maxResults=5');
        const it = (b.items || []).find((x) => x.snippet && x.snippet.liveChatId);
        if (it) return { videoId: it.id, chatId: it.snippet.liveChatId };
        log('[youtube] no live broadcast on your channel yet - checking again in 30s');
      }
    } catch (e) {
      log('[youtube] cannot look up the live stream:', e.message);
    }
    await sleep(30000);
  }
}

// Reads chat for as long as the server runs; when a broadcast ends it waits for the next one (next day).
async function start({ onChat, onSuperChat, onMember, log }) {
  const minPoll = Number(process.env.YT_MIN_POLL_MS || 10000);
  for (;;) {
    const found = await findChat(log);
    current.videoId = found.videoId;
    current.chatId = found.chatId;
    log(`[youtube] connected to live chat (video ${found.videoId})`);
    const startedAt = Date.now();
    let page = '';
    let ended = false;
    while (!ended) {
      let wait = minPoll;
      try {
        const j = await api(`/liveChat/messages?liveChatId=${found.chatId}&part=snippet,authorDetails&maxResults=200${page ? '&pageToken=' + page : ''}`);
        page = j.nextPageToken || page;
        wait = Math.max(Number(j.pollingIntervalMillis) || 0, minPoll);
        for (const it of j.items || []) {
          const s = it.snippet || {};
          if (Date.parse(s.publishedAt) < startedAt - 60000) continue; // skip old history on connect
          const a = it.authorDetails || {};
          if (a.isChatOwner && s.type === 'textMessageEvent') continue; // our own posts (support link)
          const author = a.displayName || 'Dost';
          if (s.type === 'textMessageEvent') {
            onChat({ author, text: s.displayMessage || '', isMember: Boolean(a.isChatSponsor), isMod: Boolean(a.isChatModerator), isOwner: Boolean(a.isChatOwner) });
          } else if (s.type === 'superChatEvent' || s.type === 'superStickerEvent') {
            const d = s.superChatDetails || s.superStickerDetails || {};
            onSuperChat({ id: it.id, name: author, amount: d.currency === 'INR' ? Math.round(Number(d.amountMicros) / 1e6) : 0, display: d.amountDisplayString || '', message: d.userComment || '' });
          } else if (s.type === 'newSponsorEvent' && onMember) {
            onMember(author);
          }
        }
      } catch (e) {
        if (e.reason === 'liveChatEnded' || e.reason === 'liveChatNotFound' || e.status === 404) { log('[youtube] live chat ended - waiting for the next broadcast'); ended = true; continue; }
        if (e.reason === 'quotaExceeded') { log('[youtube] API quota used up for today - chat reading paused'); wait = 15 * 60000; } else {
          log('[youtube] poll error:', e.message);
          wait = 30000;
        }
      }
      await sleep(wait);
    }
    current.videoId = '';
    current.chatId = '';
  }
}

// Likes + viewers every 60s (1 quota unit per call).
async function pollStats({ onStats, log }) {
  for (;;) {
    if (current.videoId) {
      try {
        const v = await api(`/videos?part=statistics,liveStreamingDetails&id=${encodeURIComponent(current.videoId)}`);
        const it = v.items && v.items[0];
        if (it) onStats({ likes: Number(it.statistics && it.statistics.likeCount), viewers: Number(it.liveStreamingDetails && it.liveStreamingDetails.concurrentViewers) });
      } catch (e) {
        log('[youtube] stats error:', e.message);
      }
    }
    await sleep(60000);
  }
}

// Post a message into the live chat as the channel (needs OAuth with a youtube / youtube.force-ssl scope).
async function postChat(text) {
  if (!hasOAuth() || !current.chatId) return false;
  await api('/liveChat/messages?part=snippet', { method: 'POST', body: { snippet: { liveChatId: current.chatId, type: 'textMessageEvent', textMessageDetails: { messageText: text.slice(0, 200) } } } });
  return true;
}

// Startup check: is OAuth working and what can it see? (never prints secrets)
async function selfTest() {
  if (!hasOAuth()) return 'OAuth not configured';
  await accessToken();
  const b = await api('/liveBroadcasts?part=snippet&broadcastStatus=all&broadcastType=all&maxResults=1');
  return `OAuth ok, channel broadcasts readable (${(b.pageInfo && b.pageInfo.totalResults) || 0} found)`;
}

module.exports = { start, pollStats, postChat, selfTest, hasOAuth, current };
