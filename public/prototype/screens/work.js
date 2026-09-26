import { badge, button, sectionHeading, metric, workItem } from '../ui.js';
import { payrollSteps } from '../data.js';

export function homeScreen(s) {
  if (s.role === 'Staff') return `${sectionHeading('Good morning, Maya.', 'A little more clarity for your day.', 'YOUR SPACE · FICTIONAL EXAMPLE')}
  <div class="hero"><div><div class="eyebrow">TODAY AT SOHO</div><h2>Your day, in one place.</h2><p>Your next shift starts at 14:00. See your time, leave and learning without chasing a manager.</p>${button('View my timesheet →', 'navigate', 'timesheets', { primary: true })}</div><div class="hero-symbol" aria-hidden="true">✳</div></div>
  <div class="metrics">${metric('NEXT SHIFT', '14:00', 'Soho · front of house')}${metric('HOLIDAY', '12 days', 'Example available balance')}${metric('LEARNING', '2 tasks', 'One due this week')}</div>
  <div class="panel spacious"><h2>Up next</h2>${workItem('TODAY', 'Check your shift', 'See location and start time.', 'View rota', 'rota')}${workItem('THIS WEEK', 'Complete food safety', 'Short lesson on your phone.', 'Open lesson', 'learning')}</div>`;
  return `${sectionHeading('Good morning.', 'What needs your attention, across the whole team.', 'SATURDAY · EXAMPLE WORKSPACE')}
  <div class="hero"><div><div class="eyebrow">THE WORKSPACE AT A GLANCE</div><h2>Start with what matters.</h2><p>See the next useful action in each area, then move through a clear review. Everything here is a design example.</p>${button('Review today’s work →', 'navigate', 'timesheets', { primary: true })}</div><div class="hero-symbol" aria-hidden="true">✳</div></div>
  <div class="metrics">${metric('NEEDS A DECISION', '4', 'Across your workspace', 'accent')}${metric('JOINING', '1', 'Awaiting manager checks')}${metric('ROTA', '1', 'Shift with a conflict')}${s.role === 'Admin' ? metric('PAYROLL', 'Review', 'Never approve with a blocker') : metric('REPORTS', 'Partial', 'Two entries still pending')}</div>
  <div class="section-title"><div><div class="eyebrow">YOUR PRIORITIES</div><h2>Pick up where the work is</h2></div><span class="subtle">Ordered by urgency</span></div>
  <div class="panel">${workItem('TIME · SOHO', '2 time entries to review', 'One entry is missing location evidence. Check before approving.', 'Open timesheets', 'timesheets', 'Needs review')}${workItem('PEOPLE · CARNABY', 'Leon’s details need a check', 'Identity evidence and contract terms need separate confirmation.', 'Review joining', 'joining', 'Waiting')}${workItem('HOLIDAY · SOHO', 'One leave request', 'The request is pending and the balance is shown alongside it.', 'Review holiday', 'holiday', 'Pending')}${s.role === 'Admin' ? workItem('PAYROLL', 'Period is in review', 'Outstanding time entries block the approval step.', 'Inspect payroll', 'payroll', 'Blocked') : workItem('REPORTS', 'Coverage is incomplete', 'Two entries are still pending. Figures remain partial.', 'View reports', 'reports', 'Partial')}</div>`;
}

export function rotaScreen(s) {
  const shifts = [['Mon 28 Sep', '14:00 – 22:00', 'Maya Chen', 'Soho', 'Covered'], ['Tue 29 Sep', '10:00 – 18:00', 'Leon Ortiz', 'Carnaby', 'Needs cover'], ['Wed 30 Sep', '22:00 – 06:00', 'Noor Patel', 'Shoreditch', 'Overnight']];
  const filtered = s.role === 'Staff' ? shifts.filter(x => x[2] === 'Maya Chen') : shifts.filter(x => s.location === 'All locations' || x[3] === s.location);
  return `${sectionHeading('Rota', 'A week everyone can understand.', 'WEEK OF 28 SEPTEMBER · EXAMPLE')}
  <div class="toolbar"><div class="segmented">${['This week', 'Next week'].map(x => button(x, 'rota-filter', x, { active: s.rotaFilter === x })).join('')}</div><span class="subtle">${s.role === 'Staff' ? 'Your shifts only' : 'View coverage and conflicts before publishing'}</span></div>
  <div class="panel"><div class="panel-heading"><h2>${s.rotaFilter}</h2>${badge('Example schedule')}</div>${filtered.map(([day,time,name,loc,status]) => `<div class="work-item"><div><div class="eyebrow">${day} · ${loc}</div><h3>${name}</h3><p>${time}${status === 'Overnight' ? ' · ends the following day' : ''}</p></div><div class="work-side">${badge(status)}</div></div>`).join('') || `<div class="empty">No shifts at this location.</div>`}</div>
  ${s.role !== 'Staff' ? `<div class="callout">One shift needs cover. A real approval would validate site, shift ownership and conflicting requests on the server before changing the rota.</div>` : ''}`;
}

export function timesheetScreen(s) {
  return `${sectionHeading('Timesheets', s.role === 'Staff' ? 'Your time, clearly recorded.' : 'Review evidence before approving time.', 'EXAMPLE ENTRIES · NO CLOCK ACTIONS SENT')}
  ${s.role === 'Staff' ? `<div class="hero compact"><div><div class="eyebrow">CLOCK STATUS</div><h2>Not clocked in</h2><p>For the real app, a clock-in must check your workspace, shift and location before it is saved.</p>${button('Preview clock-in guidance', 'notice', 'A real clock-in would require your identity, workspace and location to be checked.', { primary: true })}</div></div>` : `<div class="metrics">${metric('NEEDS REVIEW', '2', 'Check before payroll')}${metric('LOCATION EVIDENCE', '1 missing', 'Ask for a reason')}${metric('APPROVED', '12', 'This example week')}</div>`}
  <div class="panel"><div class="panel-heading"><h2>${s.role === 'Staff' ? 'Your recent entries' : 'Review queue'}</h2><div class="segmented">${['Needs review', 'All entries'].map(x => button(x, 'timesheet-filter', x, { active: s.timesheetFilter === x })).join('')}</div></div>
  ${s.role === 'Staff' ? `<div class="work-item"><div><h3>Monday · Soho</h3><p>14:02 – 21:58 · ready for review</p></div>${badge('Submitted')}</div>` : `<div class="work-item"><div><div class="eyebrow">SOHO · MON 28 SEP</div><h3>Maya Chen</h3><p>14:02 – 21:58 · location evidence available</p></div>${badge('Needs review')}</div><div class="work-item"><div><div class="eyebrow">CARNABY · TUE 29 SEP</div><h3>Leon Ortiz</h3><p>10:07 – 17:52 · location evidence missing</p></div>${badge('Check location')}</div>`}</div>
  ${s.role !== 'Staff' ? `<div class="callout">Approving time changes payroll inputs. This prototype displays the decision point but cannot submit an approval.</div>` : ''}`;
}

export function holidayScreen(s) {
  const former = s.holidayFilter === 'History';
  return `${sectionHeading('Holiday', 'A trustworthy balance and a clear next decision.', 'ALL VALUES FICTIONAL')}
  ${s.role === 'Staff' ? '' : `<div class="toolbar"><div class="segmented">${['Current team', 'History'].map(x => button(x, 'holiday-filter', x, { active: s.holidayFilter === x })).join('')}</div></div>`}
  ${former ? `<div class="panel spacious"><h2>Former colleagues</h2><p>History stays accessible for authorised review. People who have left do not appear in current leave requests or current team balances.</p><div class="work-item"><div><h3>Eli Brooks</h3><p>Carnaby · historical holiday record</p></div>${badge('Former')}</div></div>` : `<div class="metrics">${metric('ACCRUED', '16 days', 'Example to date')}${metric('TAKEN', '4 days', 'Approved leave')}${metric('AVAILABLE', '12 days', '16 accrued − 4 taken')}</div>
    <div class="split-layout"><div class="panel spacious"><div class="eyebrow">${s.role === 'Staff' ? 'YOUR REQUEST' : 'ONE REQUEST TO REVIEW'}</div><h2>Maya Chen · 2 days</h2><p class="lead">12–13 October · Soho</p><div class="fact"><span>Available before request</span><strong>12 days</strong></div><div class="fact"><span>If approved</span><strong>10 days remaining</strong></div>${badge(s.holidayReviewed ? 'Preview reviewed' : 'Pending')}
    <div class="row-actions">${s.role === 'Staff' ? button('Explore request journey', 'notice', 'A real request needs a saved balance and server validation.') : button(s.holidayReviewed ? 'Reset review preview' : 'Preview manager review', 'holiday-review', '', { primary: true })}</div></div>
    <aside class="panel spacious"><div class="eyebrow">BALANCE EXPLAINED</div><h3>Where the balance comes from</h3><div class="timeline"><div>Opening position: confirmed separately</div><div>Accrued from eligible work</div><div>Approved leave deducted once</div><div>Adjustments shown with their source</div></div><p class="subtle">A preview action never changes a real leave balance.</p></aside></div>`}`;
}

export function payrollScreen(s) {
  const i = s.payrollStep;
  const descriptions = ['Check entries, adjustments and holiday payments before review.', 'Resolve blockers and compare evidence against the draft.', 'A named reviewer confirms the exact period and locks it.', 'Share the approved result and check delivery separately.'];
  const blockers = ['2 timesheets still need review', '1 holiday item needs checking'];
  return `${sectionHeading('Payroll', 'A predictable route from source data to a shared result.', 'FICTIONAL PERIOD · NO LIVE AMOUNTS')}
  <div class="journey panel" role="group" aria-label="Payroll stages">${payrollSteps.map((label, n) => `<button data-action="payroll-step" data-value="${n}" class="journey-step ${i === n ? 'current' : ''}" aria-current="${i === n ? 'step' : 'false'}"><span>${n + 1}</span>${label}</button>`).join('')}</div>
  <div class="split-layout"><div class="panel spacious"><div class="eyebrow">EXAMPLE PERIOD · SEPTEMBER</div><h2>${payrollSteps[i]}</h2><p class="lead">${descriptions[i]}</p>
  ${i === 0 ? `<div class="checklist"><div>✓ Employees included in this example</div><div>◷ Two timesheets waiting for review</div><div>◷ Holiday amount waiting for review</div></div>` : ''}
  ${i === 1 ? `<div class="checklist">${blockers.map(x => `<div>! ${x}</div>`).join('')}<div>✓ Each adjustment keeps its source</div></div>` : ''}
  ${i === 2 ? `<div class="callout">Approval is unavailable while review blockers remain. In the real app the server must also enforce this check.</div>` : ''}
  ${i === 3 ? `<div class="callout">Sharing becomes available only after a completed approval. “Sent” does not prove an email was delivered.</div>` : ''}
  <div class="row-actions">${i > 0 ? button('Previous stage', 'payroll-step', String(i - 1)) : ''}${i < 3 ? button('Explore next stage →', 'payroll-step', String(i + 1), { primary: true }) : button(s.payrollAcknowledged ? 'Preview noted ✓' : 'Acknowledge walkthrough', 'payroll-ack', '', { primary: true })}</div></div>
  <aside class="panel spacious"><div class="eyebrow">PERIOD SNAPSHOT</div><h3>September · example only</h3><div class="fact"><span>Worked time</span><strong>Needs review</strong></div><div class="fact"><span>Holiday pay</span><strong>Needs review</strong></div><div class="fact"><span>Approval</span><strong>Blocked</strong></div><div class="callout neutral">No calculated pay, holiday balance or approval is simulated as authoritative.</div></aside></div>`;
}
