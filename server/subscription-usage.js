'use strict';

const db = require('./db');

async function recordPaidFeatureUse(userId, feature) {
  await db.insertDoc('activity_log', {
    user_id: Number(userId),
    action: 'subscription_feature_used',
    details: String(feature).slice(0, 80),
  });
}

module.exports = { recordPaidFeatureUse };
