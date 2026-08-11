// Typed formatting bridge for the classic Tereka Online SPA.
// Keep behavior aligned with src/formatting/formatters.ts while runtime modules migrate to ES modules.

/** @type {TerekaFormatterBridge} */
var TerekaFormatters = Object.freeze({
  formatMoneyValue(value, region) {
    return new Intl.NumberFormat(region.locale, {
      style: "currency",
      currency: region.currency,
      minimumFractionDigits: region.currencyDigits,
      maximumFractionDigits: region.currencyDigits
    }).format(Number(value || 0));
  },
  formatDateValue(value, region) {
    return formatDateWithOptions(value, region, {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  },
  formatDateTimeValue(value, region) {
    return formatDateWithOptions(value, region, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  },
  formatShortDateValue(value, region) {
    return formatDateWithOptions(value, region, {
      day: "2-digit",
      month: "short"
    });
  }
});

function formatDateWithOptions(value, region, options) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(region.locale, options);
}
