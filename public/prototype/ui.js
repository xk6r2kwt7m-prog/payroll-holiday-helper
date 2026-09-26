export function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
export function button(label, action, value = '', opts = {}) {
  return `<button type="button" class="btn ${opts.primary ? 'primary' : ''} ${opts.active ? 'active' : ''} ${opts.ghost ? 'ghost' : ''}" data-action="${escapeHtml(action)}" data-value="${escapeHtml(value)}" ${opts.disabled ? 'disabled' : ''}>${escapeHtml(label)}</button>`;
}
export function badge(label) { const tone = /blocked|overdue|failed|expired|former|needs review|missing/i.test(label) ? 'warn' : /verified|approved|active|complete|delivered/i.test(label) ? 'good' : 'info'; return `<span class="badge ${tone}">${escapeHtml(label)}</span>`; }
export function sectionHeading(title, subtitle, kicker = '') { return `<header class="screen-head"><div>${kicker ? `<div class="eyebrow">${escapeHtml(kicker)}</div>` : ''}<h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div></header>`; }
export function emptyState(title, description) { return `<div class="empty"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(description)}</p></div>`; }
export function metric(label, value, note, tone = '') { return `<div class="metric ${tone}"><div class="eyebrow">${escapeHtml(label)}</div><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></div>`; }
export function workItem(kicker, title, detail, action, target, status = '') { return `<div class="work-item"><div><div class="eyebrow">${escapeHtml(kicker)}</div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(detail)}</p></div><div class="work-side">${status ? badge(status) : ''}${button(action + ' →', 'navigate', target)}</div></div>`; }
