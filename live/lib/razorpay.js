'use strict';
const crypto = require('crypto');

// Razorpay signs the RAW request body with your webhook secret (HMAC-SHA256, hex) in X-Razorpay-Signature.
function verify(raw, signature, secret) {
  if (!secret || !signature) return false;
  const expected = Buffer.from(crypto.createHmac('sha256', secret).update(raw).digest('hex'));
  const got = Buffer.from(String(signature));
  return expected.length === got.length && crypto.timingSafeEqual(expected, got);
}

function pickNote(notes, exact, pattern, skip) {
  if (exact && notes[exact]) return String(notes[exact]);
  for (const k of Object.keys(notes)) if (k !== skip && pattern.test(k) && notes[k]) return String(notes[k]);
  return '';
}

// Only "payment.captured" with a captured entity counts. authorized / failed / pending events are never shown,
// and payment_link.paid / order.paid are skipped because they fire for the same payment.
function parse(body) {
  if (!body || body.event !== 'payment.captured') return null;
  const p = body.payload && body.payload.payment && body.payload.payment.entity;
  if (!p || !p.id || (p.status && p.status !== 'captured')) return null;
  const notes = p.notes && !Array.isArray(p.notes) ? p.notes : {};
  const nameKey = Object.keys(notes).find((k) => notes[k] && (k === process.env.RAZORPAY_NAME_FIELD || /name/i.test(k)));
  const name = nameKey ? String(notes[nameKey]) : '';
  const message = pickNote(notes, '', /message|msg|wish|note/i, nameKey);
  return {
    id: p.id,
    paise: p.amount || 0,
    amount: Math.round((p.amount || 0) / 100),
    currency: p.currency || 'INR',
    name,
    message,
    noteKeys: Object.keys(notes),
  };
}

// Second check, straight from Razorpay's API (needs RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET).
const canVerify = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
async function fetchPayment(id) {
  const base = process.env.RAZORPAY_API_BASE || 'https://api.razorpay.com';
  const auth = Buffer.from(process.env.RAZORPAY_KEY_ID + ':' + process.env.RAZORPAY_KEY_SECRET).toString('base64');
  const r = await fetch(`${base}/v1/payments/${encodeURIComponent(id)}`, { headers: { Authorization: 'Basic ' + auth }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

module.exports = { verify, parse, canVerify, fetchPayment };
