'use strict';

const express = require('express');
const db = require('../db');
const auth = require('../auth');
const {
  methodError, sendOk, sendError, failFromError, text,
} = require('./_helpers');

const router = express.Router();
router.use((req, res, next) => req.method === 'POST' ? auth.csrfMiddleware(req, res, next) : next());

router.all('/', async (req, res) => {
  if (req.method !== 'POST') return methodError(res);
  const body = req.body || {};
  const name = text(body.name, 120);
  const email = text(body.email, 254);
  const message = text(body.message, 10000);
  if (!name || !email || !message) return sendError(res, 'يرجى تعبئة جميع الحقول');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendError(res, 'البريد الإلكتروني غير صحيح');
  if ([...message].length < 10) return sendError(res, 'الرسالة قصيرة جداً — يرجى كتابة ١٠ أحرف على الأقل');

  try {
    await db.insertDoc('contact_messages', {
      name,
      email,
      message,
      ip: req.ip || '',
      is_read: 0,
    });
    return sendOk(res, [], 'تم إرسال رسالتك — سنرد خلال يوم عمل واحد');
  } catch (error) {
    return failFromError(res, error);
  }
});

module.exports = router;