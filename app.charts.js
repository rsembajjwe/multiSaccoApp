// Lightweight, dependency-free inline-SVG charts for Tereka Online reporting.
// No external charting library is used so the strict Content-Security-Policy (script-src 'self')
// is respected. Each function returns an SVG/HTML string themed via the .chart* CSS classes.

const CHART_PALETTE = ["#0f4638", "#2f8f6b", "#c8a24a", "#b4552d", "#3b6ea5", "#7a5299"];

function chartColorAt(index, override) {
  return override || CHART_PALETTE[index % CHART_PALETTE.length];
}

// Vertical bar chart. data: [{ label, value, color? }]. Values are compared by magnitude.
function svgBarChart(data, options) {
  const opts = options || {};
  const width = opts.width || 340;
  const height = opts.height || 180;
  const padX = 30;
  const padTop = 18;
  const padBottom = 34;
  const items = (data || []).filter((item) => item && isFinite(Number(item.value)));
  if (!items.length) return `<div class="chart-empty">No data to chart yet.</div>`;
  const max = Math.max(1, ...items.map((item) => Math.abs(Number(item.value))));
  const slot = (width - padX * 2) / items.length;
  const format = typeof opts.format === "function" ? opts.format : (value) => String(value);
  const bars = items.map((item, index) => {
    const value = Math.abs(Number(item.value));
    const barHeight = (value / max) * (height - padTop - padBottom);
    const w = Math.min(48, slot * 0.6);
    const x = padX + index * slot + (slot - w) / 2;
    const y = height - padBottom - barHeight;
    return `
      <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(1, barHeight).toFixed(1)}" rx="4" fill="${chartColorAt(index, item.color)}"></rect>
      <text x="${(x + w / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle" class="chart-value">${escapeHtml(format(Number(item.value)))}</text>
      <text x="${(x + w / 2).toFixed(1)}" y="${(height - padBottom + 16).toFixed(1)}" text-anchor="middle" class="chart-label">${escapeHtml(String(item.label || ""))}</text>`;
  }).join("");
  return `<svg viewBox="0 0 ${width} ${height}" class="chart" role="img" aria-label="${escapeHtml(opts.title || "Bar chart")}">
    <line x1="${padX}" y1="${height - padBottom}" x2="${width - padX}" y2="${height - padBottom}" class="chart-axis"></line>
    ${bars}
  </svg>`;
}

// Donut chart built from concentric stroked arcs (no centre-fill hack).
// segments: [{ label, value, color? }].
function svgDonutChart(segments, options) {
  const opts = options || {};
  const size = opts.size || 168;
  const strokeWidth = opts.strokeWidth || 22;
  const radius = size / 2 - strokeWidth / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  const items = (segments || [])
    .map((segment, index) => ({ label: segment.label, value: Math.abs(Number(segment.value) || 0), color: chartColorAt(index, segment.color) }))
    .filter((segment) => segment.value > 0);
  const total = items.reduce((sum, segment) => sum + segment.value, 0);
  const circumference = 2 * Math.PI * radius;
  if (!total) return `<div class="chart-empty">No data to chart yet.</div>`;
  let offset = 0;
  const arcs = items.map((segment) => {
    const length = (segment.value / total) * circumference;
    const arc = `<circle cx="${cx}" cy="${cy}" r="${radius.toFixed(1)}" fill="none" stroke="${segment.color}" stroke-width="${strokeWidth}" stroke-dasharray="${length.toFixed(2)} ${(circumference - length).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"></circle>`;
    offset += length;
    return arc;
  }).join("");
  const centre = opts.centreLabel
    ? `<text x="${cx}" y="${cy + 5}" text-anchor="middle" class="chart-centre">${escapeHtml(String(opts.centreLabel))}</text>`
    : "";
  return `<svg viewBox="0 0 ${size} ${size}" class="chart" role="img" aria-label="${escapeHtml(opts.title || "Donut chart")}">${arcs}${centre}</svg>`;
}

// Line/area trend chart. points: [{ label, value }] in time order.
function svgLineChart(points, options) {
  const opts = options || {};
  const width = opts.width || 340;
  const height = opts.height || 150;
  const padX = 30;
  const padTop = 14;
  const padBottom = 26;
  const items = (points || []).filter((point) => point && isFinite(Number(point.value)));
  if (items.length < 2) return `<div class="chart-empty">Not enough history to chart a trend yet.</div>`;
  const values = items.map((point) => Number(point.value));
  const max = Math.max(...values);
  const min = Math.min(...values, 0);
  const range = (max - min) || 1;
  const plotWidth = width - padX * 2;
  const plotHeight = height - padTop - padBottom;
  const baseline = padTop + plotHeight;
  const xAt = (index) => padX + (plotWidth * index) / (items.length - 1);
  const yAt = (value) => padTop + plotHeight - ((value - min) / range) * plotHeight;
  const color = opts.color || "#0f766e";
  const line = items.map((point, index) => `${xAt(index).toFixed(1)},${yAt(Number(point.value)).toFixed(1)}`).join(" ");
  const area = `${padX},${baseline.toFixed(1)} ${line} ${(padX + plotWidth).toFixed(1)},${baseline.toFixed(1)}`;
  const dots = items.map((point, index) => `<circle cx="${xAt(index).toFixed(1)}" cy="${yAt(Number(point.value)).toFixed(1)}" r="2.5" fill="${color}"></circle>`).join("");
  const labels = items.map((point, index) =>
    (index === 0 || index === items.length - 1 || items.length <= 6)
      ? `<text x="${xAt(index).toFixed(1)}" y="${(height - padBottom + 14).toFixed(1)}" text-anchor="middle" class="chart-label">${escapeHtml(String(point.label || ""))}</text>`
      : "").join("");
  return `<svg viewBox="0 0 ${width} ${height}" class="chart" role="img" aria-label="${escapeHtml(opts.title || "Trend chart")}">
    <line x1="${padX}" y1="${baseline.toFixed(1)}" x2="${(padX + plotWidth).toFixed(1)}" y2="${baseline.toFixed(1)}" class="chart-axis"></line>
    <polygon points="${area}" fill="${color}" fill-opacity="0.10"></polygon>
    <polyline points="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></polyline>
    ${dots}${labels}
  </svg>`;
}

// A legend for a set of [{ label, value, color? }] entries, with optional value formatting.
function chartLegend(entries, options) {
  const opts = options || {};
  const format = typeof opts.format === "function" ? opts.format : null;
  // The swatch is an inline SVG (fill is an SVG attribute) rather than a styled span, so it renders
  // under the strict Content-Security-Policy (style-src 'self', no inline styles).
  const rows = (entries || []).map((entry, index) => `
    <li><svg class="chart-swatch" viewBox="0 0 12 12" aria-hidden="true"><rect width="12" height="12" rx="3" fill="${chartColorAt(index, entry.color)}"></rect></svg>
      <span class="chart-legend-label">${escapeHtml(String(entry.label || ""))}</span>
      ${format ? `<span class="chart-legend-value">${escapeHtml(format(Number(entry.value) || 0))}</span>` : ""}</li>`).join("");
  return `<ul class="chart-legend">${rows}</ul>`;
}
