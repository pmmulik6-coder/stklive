'use strict';
// Sends a correctly SIGNED fake "payment.captured" webhook to your local server, to test the full path
// (signature check -> name on screen -> voice shout-out) without spending money.
//   node simulate-razorpay.js "Rahul" 101 "Keep going!"
const crypto = require('crypto');
const path = require('path');
require('./lib/env').loadEnv(path.join(__dirname, '.env'));

const [name = 'Rahul', amount = '101', message = ''] = process.argv.slice(2);
const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
if (!secret) { console.error('Set RAZORPAY_WEBHOOK_SECRET in live/.env first (any text works for local tests).'); process.exit(1); }

const body = JSON.stringify({
  event: 'payment.captured',
  payload: { payment: { entity: { id: 'pay_sim' + Date.now(), amount: Number(amount) * 100, currency: 'INR', status: 'captured', notes: { name, message } } } },
});
const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
const url = `http://127.0.0.1:${process.env.PORT || 8787}/razorpay/webhook`;

fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Razorpay-Signature': sig }, body })
  .then(async (r) => console.log('server replied', r.status, await r.text()))
  .catch((e) => console.error('could not reach the server:', e.message));
