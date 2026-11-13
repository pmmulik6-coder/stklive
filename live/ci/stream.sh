#!/usr/bin/env bash
# Runs on the GitHub Actions Ubuntu runner:
#   commentary server -> Chrome (game page) on a virtual screen -> ffmpeg -> YouTube RTMPS, for $MINUTES minutes.
set -uo pipefail
MINUTES="${MINUTES:-5}"
W="${STREAM_W:-720}"; H="${STREAM_H:-1280}"; FPS="${STREAM_FPS:-30}"; VBR="${STREAM_KBPS:-3000}"
: "${YT_STREAM_KEY:?add the YT_STREAM_KEY secret in the repo settings}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOGS="$ROOT/live/data/logs"; mkdir -p "$LOGS"
log() { echo "$(date +%H:%M:%S) $*"; }

# 1) virtual screen + virtual sound card (Chrome plays into it, ffmpeg records it)
Xvfb :99 -screen 0 "${W}x${H}x24" -nolisten tcp &
export DISPLAY=:99
pulseaudio --start --exit-idle-time=-1
pactl load-module module-null-sink sink_name=live sink_properties=device.description=live >/dev/null
pactl set-default-sink live

# 2) commentary server; wait until the Kokoro voice is loaded (first run downloads the model)
(cd "$ROOT/live" && node server.js > "$LOGS/server.log" 2>&1) &
for i in $(seq 1 60); do
  sleep 5
  curl -s http://127.0.0.1:8787/state | grep -q '"voiceReady":true' && { log "voice ready"; break; }
done
grep -q '"voiceReady":true' <(curl -s http://127.0.0.1:8787/state) || log "voice not ready after 5 min - going live anyway"

# 3) the game page, full screen, sound allowed without a click
google-chrome --kiosk --no-first-run --no-default-browser-check --disable-infobars --noerrdialogs \
  --user-data-dir=/tmp/chrome-live --window-position=0,0 --window-size="${W},${H}" \
  --autoplay-policy=no-user-gesture-required --use-angle=swiftshader --enable-unsafe-swiftshader \
  --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows \
  "http://127.0.0.1:8787/?pr=1" > "$LOGS/chrome.log" 2>&1 &
sleep 15

# 4) stream; ffmpeg exits on a network error, so restart it right away until the time is up
END=$(( $(date +%s) + MINUTES * 60 ))
URL="rtmps://a.rtmps.youtube.com:443/live2/${YT_STREAM_KEY}"
n=0
while [ "$(date +%s)" -lt "$END" ]; do
  n=$((n + 1)); left=$(( END - $(date +%s) ))
  log "ffmpeg start #$n (${left}s left)"
  timeout "$left" ffmpeg -hide_banner -loglevel warning -stats_period 30 \
    -thread_queue_size 1024 -f x11grab -draw_mouse 0 -video_size "${W}x${H}" -framerate "$FPS" -i :99.0 \
    -thread_queue_size 1024 -f pulse -i live.monitor \
    -c:v libx264 -preset veryfast -pix_fmt yuv420p -g $((FPS * 2)) -keyint_min $((FPS * 2)) \
    -b:v "${VBR}k" -maxrate "${VBR}k" -bufsize "$((VBR * 2))k" \
    -c:a aac -b:a 128k -ar 44100 -ac 2 \
    -f flv "$URL" 2>&1 | sed "s/${YT_STREAM_KEY}/***/g"
  [ "$(date +%s)" -lt "$END" ] && { log "ffmpeg stopped early - reconnecting in 2s"; sleep 2; }
done
log "time is up - stream finished after $n ffmpeg run(s)"
curl -s http://127.0.0.1:8787/state | head -c 600; echo
