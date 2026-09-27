'use strict';

const { jsonError, jsonOk } = require('../auth');

function sendOk(res, data = [], message = 'نجح الطلب') {
  return jsonOk(res, data, message);
}

function sendError(res, message, status = 400, code) {
  return jsonError(res, message, status, code);
}

function actionOf(req) {
  return String(req.body?.action || req.query?.action || '').trim();
}

function methodError(res) {
  res.set('Allow', 'GET, POST');
  return sendError(res, 'طريقة الطلب غير مدعومة', 405);
}

function failFromError(res, error, fallback = 'تعذر إتمام الطلب') {
  if (error?.status && error?.expose) {
    return sendError(res, error.message, error.status, error.code);
  }
  return sendError(res, fallback, 500);
}

function httpError(message, status = 400, code) {
  const error = new Error(message);
  error.status = status;
  error.expose = true;
  if (code) error.code = code;
  return error;
}

function text(value, maxLength = 10000) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function timestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

module.exports = {
  actionOf,
  methodError,
  sendOk,
  sendError,
  failFromError,
  httpError,
  text,
  number,
  timestamp,
  escapeHtml,
};