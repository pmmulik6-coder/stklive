// Live-stream client: host voice, QR + red UPI support button/popup, confirmed-payment card + history, compact live chat.
// Always on (add ?live=0 for the plain game). Talks to the commentary server at ?server=... or localhost:8787;
// without that server it runs a local demo so the whole layout can still be checked.
(function () {
  'use strict';
  const params = new URLSearchParams(location.search);
  if (params.get('live') === '0') return;

  const server = params.get('server') || (location.port === '8787' ? location.origin : 'http://localhost:8787');
  const $ = (id) => document.getElementById(id);
  const host = $('host');
  const voice = $('voice');
  const list = $('feed-list');
  const qrCard = $('qr-card');
  const popup = $('pay-popup');
  const confirmBox = $('pay-confirm');
  const receipt = $('receipt');

  $('host-video').play().catch(() => {});
  const post = (path, body) => fetch(server + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, keepalive: true,
  }).catch(() => {});
  const hash = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  const retrigger = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

  // ---------- QR + payment link ----------
  function setPayLink(url) {
    if (url) popup.href = url;
  }
  function setQR(url, demo) {
    try {
      const q = qrcode(0, 'M');
      q.addData(url);
      q.make();
      $('qr-img').src = 'data:image/svg+xml;utf8,' + encodeURIComponent(q.createSvgTag({ cellSize: 8, margin: 2 }));
    } catch (e) { /* qr lib missing */ }
    qrCard.classList.toggle('demo', Boolean(demo));
    $('qr-label').textContent = demo ? 'DEMO QR' : 'ANY UPI APP';
  }
  const pay = params.get('pay');
  const UPI_URL = 'upi://pay?pa=mulikprajyot41-1@okaxis&cu=INR';
  setQR(pay || UPI_URL, false);
  setPayLink(pay || UPI_URL);

  setInterval(() => retrigger($('sub-btn'), 'press'), 9000);

  // ---------- red support popup ----------
  let popupTimer = 0;
  function showPopup(ms) {
    clearTimeout(popupTimer);
    popup.classList.add('on');
    popupTimer = setTimeout(() => popup.classList.remove('on'), ms || 25000);
  }

  // ---------- confirmed payments: big confirmation, then latest card + history ----------
  const ago = (t) => {
    const s = Math.max(0, Math.round((Date.now() - t) / 1000));
    return s < 60 ? 'just now' : s < 3600 ? Math.floor(s / 60) + ' min ago' : Math.floor(s / 3600) + ' hr ago';
  };
  let history = [];
  function renderPayments() {
    const [top, ...rest] = history;
    receipt.classList.toggle('empty', !top);
    if (!top) {
      $('rc-status').textContent = 'SUPPORT KARO';
      $('rc-amt').textContent = 'Be the first!';
      $('rc-name').textContent = 'Your name shows here';
      $('rc-foot').textContent = 'Scan the QR · any UPI app';
    } else {
      $('rc-status').textContent = 'PAYMENT SUCCESSFUL';
      $('rc-amt').textContent = top.display;
      $('rc-name').textContent = top.name;
      $('rc-foot').textContent = 'Paid via Razorpay · ' + ago(top.at);
    }
    $('recent').textContent = rest.length ? 'RECENT  ' + rest.slice(0, 4).map((p) => p.display + ' ' + p.name).join('  ·  ') : '';
  }
  setInterval(renderPayments, 15000);

  function onPayment(p) {
    history = [p].concat(history.filter((x) => !(x.at === p.at && x.name === p.name))).slice(0, 5);
    $('pc-amt').textContent = p.display;
    $('pc-name').textContent = p.name;
    retrigger(confirmBox, 'on');
    setTimeout(() => { renderPayments(); retrigger(receipt, 'flash'); }, 3600);
    window.dispatchEvent(new CustomEvent('live-fx', { detail: { tier: p.tier || 2 } }));
  }

  // ---------- compact live chat ----------
  function addChat(kind, name, text) {
    const row = document.createElement('div');
    row.className = 'frow ' + kind;
    const b = document.createElement('b');
    b.textContent = name;
    if (kind === 'chat') b.style.color = 'hsl(' + (hash(name) % 360) + ',85%,72%)';
    const s = document.createElement('span');
    s.textContent = text;
    row.append(b, s);
    list.appendChild(row);
    while (list.children.length > 3) list.firstChild.remove();
  }

  // ---------- host voice (no captions on screen) ----------
  let current = null;
  let timer = null;
  function finish(id) {
    if (!current || current.id !== id) return;
    current = null;
    clearTimeout(timer);
    host.classList.remove('speaking');
    if (window.SFX && SFX.duck) SFX.duck(false);
    post('/said?id=' + id);
  }
  function play(s) {
    if (current) finish(current.id);
    current = s;
    host.classList.add('speaking');
    if (window.SFX && SFX.duck) SFX.duck(true);
    const fallback = () => { timer = setTimeout(() => finish(s.id), s.durMs || 6000); };
    if (!s.audio) return fallback();
    voice.src = server + s.audio;
    voice.onended = () => setTimeout(() => finish(s.id), 400);
    voice.onerror = fallback;
    voice.play().catch(fallback);
  }

  // ---------- local demo (only when the commentary server is not reachable) ----------
  let demoTimers = [];
  function startDemo() {
    if (demoTimers.length) return;
    const names = ['Rahul', 'Priya', 'Aman Singh', 'Sneha', 'Vikas', 'Neha', 'Rohit', 'Pooja'];
    const texts = ['Hi didi, Delhi se', 'kitna level jayega ye bot?', 'Superb game', 'Namaste Riya ji', 'Boss level aaya!', 'Pehla comment!', 'Awesome, satisfying', 'bot noob hai'];
    let i = 0;
    let n = 0;
    addChat('chat', 'Rahul', 'Hi didi, Delhi se');
    demoTimers.push(setInterval(() => { addChat('chat', names[i % names.length], texts[i % texts.length]); i++; }, 3500));
    demoTimers.push(setTimeout(() => showPopup(12000), 4000));
    demoTimers.push(setInterval(() => {
      const amount = [51, 101, 201, 501][n % 4];
      onPayment({ name: names[(i + 3) % names.length], display: '₹' + amount, amount, tier: amount >= 500 ? 4 : amount >= 200 ? 3 : 2, at: Date.now() });
      n++;
    }, 18000));
  }
  function stopDemo() { demoTimers.forEach((t) => { clearInterval(t); clearTimeout(t); }); demoTimers = []; }

  // ---------- server connection ----------
  let connected = false;
  const es = new EventSource(server + '/events');
  es.onopen = () => { connected = true; stopDemo(); list.textContent = ''; };
  es.onerror = () => { if (!connected) startDemo(); };
  es.addEventListener('config', (e) => {
    const c = JSON.parse(e.data);
    if (c.qr) { $('qr-img').src = c.qr; qrCard.classList.remove('demo'); $('qr-label').textContent = 'ANY UPI APP'; }
    setPayLink(c.payUrl);
  });
  es.addEventListener('say', (e) => play(JSON.parse(e.data)));
  es.addEventListener('chat', (e) => { const m = JSON.parse(e.data); addChat(m.member ? 'member' : 'chat', m.author, m.text); });
  es.addEventListener('donation', (e) => onPayment(JSON.parse(e.data)));
  es.addEventListener('payments', (e) => { history = JSON.parse(e.data); renderPayments(); });
  es.addEventListener('promo', (e) => showPopup(JSON.parse(e.data).ms));

  renderPayments();
  if (params.get('demo') === '1') startDemo();
  window.addEventListener('game', (e) => post('/game-event', e.detail));
})();
