import { people, joiningSteps } from '../data.js';
import { escapeHtml as e, badge, button, sectionHeading, emptyState } from '../ui.js';

export function peopleScreen(s) {
  const matching = people.filter(person =>
    (s.peopleFilter === 'All' || person.status === s.peopleFilter) &&
    (s.location === 'All locations' || person.location === s.location) &&
    `${person.name} ${person.role} ${person.location}`.toLowerCase().includes(s.search.toLowerCase()));
  return `${sectionHeading('People', 'One clear record for every colleague.', 'People shown here are fictional.')}
    <div class="toolbar"><label class="search-wrap"><span class="sr-only">Search people</span><span aria-hidden="true">⌕</span><input data-input="search" type="search" value="${e(s.search)}" placeholder="Search name, role or location"></label>
    <div class="segmented" role="group" aria-label="Employment status">${['Active', 'Joining', 'Former', 'All'].map(x => button(x, 'people-filter', x, { active: s.peopleFilter === x })).join('')}</div></div>
    <div class="people-layout"><div class="panel people-list"><div class="panel-heading"><h2>${e(s.peopleFilter)} colleagues</h2><span class="subtle">${matching.length} shown</span></div>
    ${matching.length ? matching.map(p => `<button class="person-row ${s.selectedPerson === p.id ? 'selected' : ''}" data-action="person" data-value="${p.id}" aria-label="View ${e(p.name)}"><span class="avatar ${p.colour}">${p.initials}</span><span class="person-main"><strong>${e(p.name)}</strong><small>${e(p.role)} · ${e(p.location)}</small></span>${badge(p.status)}<span aria-hidden="true">›</span></button>`).join('') : emptyState('No matching colleagues', 'Try another status, location or name.')}
    </div><aside class="panel detail-panel">${personDetail(s)}</aside></div>`;
}

function personDetail(s) {
  const person = people.find(x => x.id === s.selectedPerson);
  if (!person) return `<div class="detail-empty"><span class="detail-graphic">◉</span><h2>A clearer picture of each person</h2><p>Select a colleague to see their status, what has been confirmed and what needs attention.</p></div>`;
  return `<div class="panel-heading"><span class="avatar large ${person.colour}">${person.initials}</span><div><h2>${e(person.name)}</h2><p>${e(person.role)} · ${e(person.location)}</p></div></div>
    <div class="detail-body">${badge(person.status)}<h3>${person.status === 'Former' ? 'Employment history' : 'At a glance'}</h3>
    <div class="fact"><span>Details</span><strong>${person.status === 'Joining' ? 'Awaiting manager checks' : 'Confirmed'}</strong></div>
    <div class="fact"><span>Documents</span><strong>${person.status === 'Joining' ? 'Review needed' : 'Up to date'}</strong></div>
    <div class="fact"><span>Holiday</span><strong>${person.status === 'Former' ? 'Historical record only' : 'Current entitlement'}</strong></div>
    <div class="callout ${person.status === 'Former' ? 'neutral' : ''}">${person.status === 'Former' ? 'Former colleagues remain available in history and are excluded from current holiday actions.' : person.status === 'Joining' ? 'Review provided details before a contract can be sent.' : 'Approved information stays on file. Only missing or changed details are requested again.'}</div>
    ${person.status === 'Joining' ? button('Open joining journey →', 'navigate', 'joining', { primary: true }) : button('View document status →', 'navigate', 'compliance')}</div>`;
}

export function joiningScreen(s) {
  const step = s.joiningStep;
  const labels = ['Invitation sent', 'Staff details collected', 'Manager review', 'Contract preparation', 'First week essentials'];
  const detail = [
    'One secure invitation starts the journey.',
    'Staff confirm only information still missing. Existing approved details stay filled.',
    'Check identity, right to work and contract terms before approval. Sensitive fields are hidden after matching entries.',
    'Review the pay rate, holiday and notice period before the contract is sent for both signatures.',
    'Give short induction and training tasks across the first week, with useful reminders and a clear progress view.',
  ];
  return `${sectionHeading('Joining', 'A calm, complete path from invite to first shift.', 'Example: Leon Ortiz · kitchen · Carnaby')}
  <div class="journey panel" role="group" aria-label="Joining stages">${joiningSteps.map((x, i) => `<button data-action="joining-step" data-value="${i}" class="journey-step ${step === i ? 'current' : ''} ${i < 2 ? 'complete' : ''}" aria-current="${step === i ? 'step' : 'false'}"><span>${i < 2 ? '✓' : i + 1}</span>${e(x)}</button>`).join('')}</div>
  <div class="split-layout"><div class="panel spacious"><div class="eyebrow">STEP ${step + 1} OF 5 · ${step < 2 ? 'COMPLETE' : 'DEMO PREVIEW'}</div><h2>${labels[step]}</h2><p class="lead">${detail[step]}</p>
  ${step === 1 ? `<div class="fact"><span>Already held and confirmed</span><strong>Preferred name, email</strong></div><div class="fact"><span>Still needed</span><strong>Bank details, NI status, right-to-work evidence</strong></div>` : ''}
  ${step === 2 ? `<div class="checklist"><div>✓ Name and contact details provided</div><div>◷ Bank details require two matching entries</div><div>◷ Right-to-work evidence awaits human review</div><div>· NI number can be marked “applied for”</div></div>` : ''}
  ${step === 3 ? `<div class="fact"><span>Pay rate</span><strong>Needs manager confirmation</strong></div><div class="fact"><span>Holiday and notice</span><strong>Needs manager confirmation</strong></div>` : ''}
  ${step === 4 ? `<div class="checklist"><div>Day 1 · welcome and safety</div><div>Day 2 · food and allergen essentials</div><div>Day 5 · service and practical sign-off</div></div>` : ''}
  <div class="row-actions">${step > 0 ? button('Previous', 'joining-step', String(step - 1)) : ''}${step < 4 ? button('Explore next step →', 'joining-step', String(step + 1), { primary: true }) : ''}</div></div>
  <aside class="panel spacious"><div class="eyebrow">STAFF VIEW</div><h3>Your start at Ugly Dumpling</h3><p>2 of 5 stages complete</p><div class="meter"><span style="width:40%"></span></div><p class="subtle">A phone-friendly checklist with one task at a time. Staff can save their progress and understand what the manager is reviewing.</p>${button('Explore learning →', 'navigate', 'learning')}</aside></div>`;
}

export function contractsScreen(s) {
  const stages = ['Check terms', 'Send for signatures', 'Signed copy'];
  return `${sectionHeading('Contracts', 'Check once. Sign with confidence.', 'No document is generated or sent in this prototype.')}
    <div class="journey panel">${stages.map((label, i) => button(`${i + 1}. ${label}`, 'contract-stage', String(i), { active: s.contractStage === i })).join('')}</div>
    <div class="split-layout"><div class="panel spacious"><div class="eyebrow">CONTRACT · FICTIONAL COLLEAGUE</div><h2>Leon Ortiz</h2>
    <p class="lead">${['Verify the essentials before generating a draft.', 'The manager and colleague both sign before it becomes a completed contract.', 'The signed version is stored and a copy can be sent once the manager confirms it.'][s.contractStage]}</p>
    ${[['Position', 'Kitchen team member'], ['Pay rate', 'Awaiting approval'], ['Holiday', 'Awaiting approval'], ['Notice period', 'Awaiting approval']].map(([a,b]) => `<div class="fact"><span>${a}</span><strong>${b}</strong></div>`).join('')}
    <div class="callout">This example has unconfirmed terms. Contract sending stays unavailable until the required reviews are complete.</div>
    <div class="row-actions">${s.contractStage < 2 ? button('See next stage →', 'contract-stage', String(s.contractStage + 1), { primary: true }) : button('Return to checks', 'contract-stage', '0')}</div></div>
    <aside class="panel spacious"><div class="eyebrow">VERSION HISTORY</div><h3>Traceable from start to finish</h3><div class="timeline"><div>Draft terms checked</div><div>Colleague signs</div><div>Manager signs</div><div>Copy delivered and stored</div></div></aside></div>`;
}
