'use strict';

// Currency units only. No exchange rates or automatic amount conversion.
const CURRENCIES = Object.freeze([
  { code: 'SAR', label: 'ريال سعودي', country: 'السعودية', locale: 'ar-SA' },
  { code: 'AED', label: 'درهم إماراتي', country: 'الإمارات', locale: 'ar-AE' },
  { code: 'KWD', label: 'دينار كويتي', country: 'الكويت', locale: 'ar-KW' },
  { code: 'QAR', label: 'ريال قطري', country: 'قطر', locale: 'ar-QA' },
  { code: 'BHD', label: 'دينار بحريني', country: 'البحرين', locale: 'ar-BH' },
  { code: 'OMR', label: 'ريال عماني', country: 'عُمان', locale: 'ar-OM' },
  { code: 'JOD', label: 'دينار أردني', country: 'الأردن', locale: 'ar-JO' },
  { code: 'EGP', label: 'جنيه مصري', country: 'مصر', locale: 'ar-EG' },
  { code: 'IQD', label: 'دينار عراقي', country: 'العراق', locale: 'ar-IQ' },
  { code: 'LBP', label: 'ليرة لبنانية', country: 'لبنان', locale: 'ar-LB' },
  { code: 'SYP', label: 'ليرة سورية', country: 'سوريا', locale: 'ar-SY' },
  { code: 'ILS', label: 'شيكل', country: 'فلسطين', locale: 'ar-PS' },
  { code: 'YER', label: 'ريال يمني', country: 'اليمن', locale: 'ar-YE' },
  { code: 'MAD', label: 'درهم مغربي', country: 'المغرب', locale: 'ar-MA' },
  { code: 'DZD', label: 'دينار جزائري', country: 'الجزائر', locale: 'ar-DZ' },
  { code: 'TND', label: 'دينار تونسي', country: 'تونس', locale: 'ar-TN' },
  { code: 'LYD', label: 'دينار ليبي', country: 'ليبيا', locale: 'ar-LY' },
  { code: 'SDG', label: 'جنيه سوداني', country: 'السودان', locale: 'ar-SD' },
  { code: 'SOS', label: 'شلن صومالي', country: 'الصومال', locale: 'ar-SO' },
  { code: 'DJF', label: 'فرنك جيبوتي', country: 'جيبوتي', locale: 'ar-DJ' },
  { code: 'KMF', label: 'فرنك قمري', country: 'جزر القمر', locale: 'ar-KM' },
  { code: 'MRU', label: 'أوقية موريتانية', country: 'موريتانيا', locale: 'ar-MR' },
  { code: 'USD', label: 'دولار أمريكي', country: 'الولايات المتحدة', locale: 'en-US' },
  { code: 'EUR', label: 'يورو', country: 'أوروبا', locale: 'de-DE' },
]);

function currencyFor(code = 'SAR') {
  return CURRENCIES.find((currency) => currency.code === code) || null;
}

function formatMoney(amount, code = 'SAR') {
  const currency = currencyFor(code) || currencyFor('SAR');
  return `${Number(amount || 0).toLocaleString(currency.locale, {
    maximumFractionDigits: new Intl.NumberFormat('en', { style: 'currency', currency: currency.code })
      .resolvedOptions().maximumFractionDigits,
  })} ${currency.code}`;
}

module.exports = { CURRENCIES, currencyFor, formatMoney };
