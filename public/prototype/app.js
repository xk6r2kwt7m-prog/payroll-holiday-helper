import { initialState, sections, locations } from './data.js';
import { escapeHtml as e, button } from './ui.js';
import { peopleScreen, joiningScreen, contractsScreen } from './screens/people.js';
import { homeScreen, rotaScreen, timesheetScreen, holidayScreen, payrollScreen } from './screens/work.js';
import { complianceScreen, learningScreen, absenceScreen, messagesScreen } from './screens/care.js';
import { reportsScreen, recruitmentScreen, locationsScreen, settingsScreen } from './screens/organisation.js';

const screens = { home: homeScreen, people: peopleScreen, joining: joiningScreen, contracts: contractsScreen,
  rota: rotaScreen, timesheets: timesheetScreen, holiday: holidayScreen, payroll: payrollScreen,
  compliance: complianceScreen, learning: learningScreen, absence: absenceScreen, messages: messagesScreen,
  reports: reportsScreen, recruitment: recruitmentScreen, locations: locationsScreen, settings: settingsScreen };
const staffPages = new Set(['home', 'rota', 'timesheets', 'holiday', 'learning', 'settings']);
const app = document.getElementById('app');
export let state = initialState();

function nav(s) {
  let previous = '';
  return sections.filter(x => s.role !== 'Staff' || staffPages.has(x.id)).map(item => {
    const group = item.group !== previous ? `<div class="nav-group">${e(item.group)}</div>` : '';
    previous = item.group;
    return `${group}<button class="nav-link ${s.page === item.id ? 'chosen' : ''}" data-action="navigate" data-value="${item.id}" ${s.page === item.id ? 'aria-current="page"' : ''}><span class="nav-icon" aria-hidden="true">${item.icon}</span><span>${e(item.label)}</span>${s.page === item.id ? '<span class="nav-mark" aria-hidden="true"></span>' : ''}</button>`;
  }).join('');
}

export function render(focusSearch = false) {
  if (state.role === 'Staff' && !staffPages.has(state.page)) state.page = 'home';
  const page = sections.find(x => x.id === state.page) || sections[0];
  document.documentElement.dataset.theme = state.theme;
  app.innerHTML = `<div class="demo-frame ${state.device === 'Phone' ? 'phone-frame' : ''}"><div class="app-shell">
    <aside class="sidebar ${state.navOpen ? 'open' : ''}" aria-label="Main navigation"><div class="brand"><span class="brand-symbol">✳</span><span>ugly<span class="brand-light">ops</span><small>THE PEOPLE WORKSPACE</small></span></div><nav>${nav(state)}</nav><div class="sidebar-foot"><span class="tiny-spark">✳</span><div><strong>Design preview</strong><small>Fictional information only</small></div></div></aside>
    <div class="app-main"><header class="topbar"><div class="top-start"><button class="menu-button" data-action="menu" aria-label="Toggle navigation" aria-expanded="${state.navOpen}">☰</button><span class="crumb">Workspace <span aria-hidden="true">/</span> <strong>${e(page.label)}</strong></span></div>
    <div class="top-tools"><label class="sr-only" for="location-picker">Preview location</label><select id="location-picker" data-change="location">${locations.map(x => `<option ${state.location === x ? 'selected' : ''}>${x}</option>`).join('')}</select><label class="sr-only" for="role-picker">Preview role</label><select id="role-picker" data-change="role">${['Manager', 'Admin', 'Staff'].map(x => `<option ${state.role === x ? 'selected' : ''}>${x}</option>`).join('')}</select><span class="top-avatar" aria-hidden="true">UD</span></div></header>
    <div class="preview-bar"><span class="preview-pill">DESIGN PREVIEW</span><span>Explore the full app with fictional information. Actions here never save, send or approve.</span><div class="preview-actions">${button(state.device === 'Desktop' ? 'Phone view' : 'Desktop view', 'device')}${button(state.theme === 'light' ? 'Dark' : 'Light', 'theme')}${button('Reset demo', 'reset')}</div></div>
    <main id="main-content" class="content" tabindex="-1">${screens[state.page](state)}<footer class="footer">UglyOps · design exploration · all people, dates and figures are fictional</footer></main></div></div></div>
    <div id="notice" class="toast ${state.notice ? 'visible' : ''}" role="status" aria-live="polite">${e(state.notice)}</div>`;
  if (focusSearch) { const input = app.querySelector('[data-input="search"]'); input?.focus(); input?.setSelectionRange(input.value.length, input.value.length); }
}

function act(action, value) {
  switch (action) {
    case 'navigate': if (!screens[value] || (state.role === 'Staff' && !staffPages.has(value))) return; state.page = value; state.navOpen = false; state.notice = ''; window.location.hash = value; break;
    case 'person': state.selectedPerson = value; break;
    case 'people-filter': state.peopleFilter = value; state.selectedPerson = null; break;
    case 'joining-step': state.joiningStep = Number(value); break;
    case 'payroll-step': state.payrollStep = Number(value); break;
    case 'payroll-ack': state.payrollAcknowledged = true; state.notice = 'Walkthrough acknowledged. No payroll record changed.'; break;
    case 'holiday-filter': state.holidayFilter = value; break;
    case 'holiday-review': state.holidayReviewed = !state.holidayReviewed; state.notice = 'Review preview only. No leave request was changed.'; break;
    case 'rota-filter': state.rotaFilter = value; break;
    case 'timesheet-filter': state.timesheetFilter = value; break;
    case 'contract-stage': state.contractStage = Number(value); break;
    case 'compliance-filter': state.complianceFilter = value; break;
    case 'learning-lesson': state.learningLesson = Number(value); state.trainingDone = false; break;
    case 'training-done': state.trainingDone = true; state.notice = 'Example progress only. No training record was changed.'; break;
    case 'message-filter': state.messageFilter = value; break;
    case 'device': state.device = state.device === 'Desktop' ? 'Phone' : 'Desktop'; break;
    case 'theme': state.theme = state.theme === 'light' ? 'dark' : 'light'; break;
    case 'reset': state = initialState(); window.location.hash = ''; break;
    case 'menu': state.navOpen = !state.navOpen; break;
    case 'notice': state.notice = value; break;
    default: return;
  }
  render();
  if (action === 'navigate') app.querySelector('#main-content')?.focus();
}

app.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (target && app.contains(target)) act(target.dataset.action, target.dataset.value || '');
});
app.addEventListener('change', event => {
  const key = event.target.dataset.change;
  if (key === 'location' || key === 'role') { state[key] = event.target.value; state.selectedPerson = null; state.notice = ''; if (state.role === 'Staff') state.holidayFilter = 'Current team'; render(); }
});
app.addEventListener('input', event => {
  if (event.target.dataset.input === 'search') { state.search = event.target.value; render(true); }
});
window.addEventListener('hashchange', () => {
  const requested = window.location.hash.slice(1);
  if (screens[requested] && requested !== state.page && (state.role !== 'Staff' || staffPages.has(requested))) { state.page = requested; render(); }
});
const initialPage = window.location.hash.slice(1);
if (screens[initialPage]) state.page = initialPage;
render();
