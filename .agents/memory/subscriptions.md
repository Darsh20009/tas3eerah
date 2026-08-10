---
name: Subscription System
description: نظام الاشتراكات — 3 خطط، المدير يتحكم بالكامل
---

## Plans (defined in config.php → PLANS constant)
- **free**: 5 quotes/month, calc_basic tool only, 30 messages/month
- **pro**: unlimited quotes, all tools (5), unlimited messages — 99 SAR/month
- **enterprise**: all pro + custom tools — 299 SAR/month

## Admin Control
- `POST /api/admin` with `action=set_plan` → changes any user's plan + expiry date
- Subscriptions panel in admin dashboard shows all users with inline plan dropdown
- `action=stats` returns plan_free/plan_pro/plan_enterprise counts

## Tool Gating
Tools are locked in `pages/dashboard.php` server-side based on `$plan['tools']` array.
JS `showPlanUpgrade()` shows modal when locked tool is clicked.

**Why:** User explicitly wanted admin to control subscriptions per user individually.
**How to apply:** To add a new plan feature, add it to PLANS array in config.php and check in Auth::planAllows() or Auth::canCreateQuote().
