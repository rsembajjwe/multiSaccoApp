import type { TerekaRegion } from "../types/domain";

export type TerekaDateInput = Date | number | string | null | undefined;
export type TerekaMoneyInput = number | string | null | undefined;

export function formatMoneyValue(value: TerekaMoneyInput, region: TerekaRegion): string {
  return new Intl.NumberFormat(region.locale, {
    style: "currency",
    currency: region.currency,
    minimumFractionDigits: region.currencyDigits,
    maximumFractionDigits: region.currencyDigits,
  }).format(Number(value || 0));
}

export function formatDateValue(value: TerekaDateInput, region: TerekaRegion): string {
  return formatDateWithOptions(value, region, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTimeValue(value: TerekaDateInput, region: TerekaRegion): string {
  return formatDateWithOptions(value, region, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatShortDateValue(value: TerekaDateInput, region: TerekaRegion): string {
  return formatDateWithOptions(value, region, {
    day: "2-digit",
    month: "short",
  });
}

function formatDateWithOptions(
  value: TerekaDateInput,
  region: TerekaRegion,
  options: Intl.DateTimeFormatOptions
): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(region.locale, options);
}
