'use strict';

const db = require('./db');
const auth = require('./auth');
const { PLANS } = require('./config');
const tools = require('./tools');
const locks = new Map();

// Serialize read/check/write operations per account, not across all users.
async function serial(userId, callback) {
  const previous = locks.get(userId) || Promise.resolve();
  const operation = previous.catch(() => {}).then(callback);
  locks.set(userId, operation);
  try { return await operation; } finally {
    if (locks.get(userId) === operation) locks.delete(userId);
  }
}

function planFor(user) {
  return PLANS[auth.effectivePlan(user)] || PLANS.free;
}
function limits(user) {
  const plan = planFor(user);
  return {
    tool_limit: user.role === 'admin' ? 0 : Number(plan.tool_limit || 0),
    history_limit: user.role === 'admin' ? -1 : Number(plan.history_limit),
    pdf_limit: user.role === 'admin' ? -1 : Number(plan.max_pdf_reports),
  };
}
function selectedTools(user) {
  const limit = limits(user).tool_limit;
  if (!limit) return Object.keys(tools);
  if (Array.isArray(user.selected_tools)) {
    return [...new Set(user.selected_tools)].filter(slug => Object.hasOwn(tools, slug)).slice(0, limit);
  }
  return Object.keys(tools).filter(slug => planFor(user).tools.includes(tools[slug].plan)).slice(0, limit);
}
function allowed(user, slug) {
  return Object.hasOwn(tools, slug) && selectedTools(user).includes(slug);
}
async function writeState(userId, tool, state) {
  return db.saveCalculatorState(userId, tool, state);
}
async function access(user) {
  return {
    ...limits(user), selected_tools: selectedTools(user),
    tools: Object.entries(tools).map(([slug, tool]) => ({ slug, title: tool.title })),
    pdf_used: await db.pdfReportUsage(user.id),
  };
}
module.exports = { serial, limits, selectedTools, allowed, writeState, access };
