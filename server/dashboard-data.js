'use strict';

const db = require('./db');
const { PLANS } = require('./config');
const { effectivePlan } = require('./auth');

async function dashboardData(user) {
  const role = user.role;
  const isAdmin = role === 'admin';
  const activePlan = effectivePlan(user);
  const plan = PLANS[activePlan] || PLANS.free;
  const month = new Date().toISOString().slice(0, 7);
  const ownerField = role === 'client' ? 'client_id' : 'employee_id';
  const owner = { [ownerField]: Number(user.id) };
  const quotesUsedThisMonth = await db.count('quotes', {
    ...owner, created_at: { $regex: `^${month}` },
  });
  const maxQuotesThisMonth = isAdmin ? -1 : plan.max_quotes;
  const quotesRemaining = maxQuotesThisMonth === -1 ? null : Math.max(0, maxQuotesThisMonth - quotesUsedThisMonth);
  const quotaLabel = maxQuotesThisMonth === -1
    ? 'تسعير غير محدود'
    : `متبقي ${quotesRemaining} من ${maxQuotesThisMonth} هذا الشهر`;

  let stats;
  if (isAdmin) {
    const [users, active, quotes, thisMonth, rating] = await Promise.all([
      db.count('users'), db.count('users', { is_active: 1 }), db.count('quotes'),
      db.count('quotes', { created_at: { $regex: `^${month}` } }),
      db.quoteRatingStats(),
    ]);
    stats = [
      ['المستخدمون', users, 'إجمالي المستخدمين', 'accent'],
      ['المستخدمون النشطون', active, 'حسابات نشطة', 'gold'],
      ['عروض الأسعار', quotes, 'كل العروض', 'green'],
      ['هذا الشهر', thisMonth, 'عروض هذا الشهر', ''],
      ['متوسط التقييمات', rating.count ? `${rating.average.toFixed(1)} / 5` : '—', `${rating.count} مشاركة`, 'gold'],
    ];
  } else if (role === 'employee') {
    const [all, thisMonth, sent, clientQuotes] = await Promise.all([
      db.count('quotes', owner),
      db.count('quotes', { ...owner, created_at: { $regex: `^${month}` } }),
      db.count('quotes', { ...owner, status: 'sent' }),
      db.findAll('quotes', owner, { projection: { client_id: 1 } }),
    ]);
    stats = [
      ['عروضي', all, 'إجمالي عروضي', 'accent'],
      ['هذا الشهر', thisMonth, 'عروض هذا الشهر', ''],
      ['مرسلة', sent, 'بانتظار الرد', 'green'],
      ['العملاء', new Set(clientQuotes.map(quote => quote.client_id)).size, 'عملاء لديّ', ''],
    ];
  } else {
    const [all, sent] = await Promise.all([
      db.count('quotes', owner), db.count('quotes', { ...owner, status: 'sent' }),
    ]);
    stats = [
      ['عروضي', all, 'إجمالي العروض', 'accent'],
      ['هذا الشهر', quotesUsedThisMonth, 'تسعيرات منشأة', ''],
      ['المتبقي', quotesRemaining === null ? 'غير محدود' : quotesRemaining,
        quotesRemaining === null ? 'ضمن خطتك الحالية' : `من ${maxQuotesThisMonth} هذا الشهر`, 'gold'],
      ['مرسلة', sent, 'بانتظار الرد', 'green'],
      ['خطتك', plan.name_ar, 'مستوى الاشتراك', ''],
    ];
  }

  const allQuotes = await db.findAll('quotes', isAdmin ? {} : owner, {
    projection: { total: 1, status: 1 },
  });
  const statusCounts = { draft: 0, sent: 0, accepted: 0, rejected: 0 };
  let total = 0;
  for (const quote of allQuotes) {
    total += Number(quote.total) || 0;
    if (Object.hasOwn(statusCounts, quote.status)) statusCounts[quote.status] += 1;
  }
  const quoteCount = allQuotes.length;
  const accepted = statusCounts.accepted;
  const overview = {
    total, average: quoteCount ? total / quoteCount : 0, accepted,
    sent: statusCounts.sent, quoteCount,
    conversion: quoteCount ? Math.round(accepted / quoteCount * 100) : 0,
    statusCounts,
  };

  const expiry = user.plan_expires_at && user.plan !== 'free'
    ? Date.parse(user.plan_expires_at) : NaN;
  const daysLeft = Number.isFinite(expiry) ? Math.ceil((expiry - Date.now()) / 86400000) : null;
  const showExpiryBanner = daysLeft !== null && daysLeft <= 7;
  const expiryExpired = showExpiryBanner && daysLeft <= 0;
  const expiryBannerMsg = !showExpiryBanner ? ''
    : expiryExpired ? 'انتهت صلاحية خطتك. يمكنك متابعة استخدام الميزات المجانية حتى تجديد الاشتراك.'
      : `تنتهي خطتك (${plan.name_ar}) خلال ${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'}. تواصل مع المدير للتجديد.`;

  return {
    user, plan, effectivePlan: activePlan, plans: PLANS, isAdmin,
    stats, overview, quotesUsedThisMonth, maxQuotesThisMonth, quotaLabel,
    showExpiryBanner, expiryExpired, expiryBannerMsg, openAccessMode: false,
    appData: {
      role, isAdmin, uid: Number(user.id), plan: user.plan,
      effectivePlan: activePlan, isPaid: activePlan !== 'free',
      name: user.name, maxQuotes: maxQuotesThisMonth,
      quotesUsed: quotesUsedThisMonth, quotesRemaining,
    },
  };
}

module.exports = dashboardData;