import { badge, button, sectionHeading, metric, workItem } from '../ui.js';

export function complianceScreen(s) {
  return `${sectionHeading('Documents', 'Collect evidence once. Review it separately.', 'RIGHT TO WORK · EXAMPLE ONLY')}
  <div class="metrics">${metric('AWAITING REVIEW', '2', 'Uploaded does not mean verified')}${metric('DUE SOON', '1', 'Check expiry and follow up')}${metric('VERIFIED', '8', 'Example current records')}</div>
  <div class="toolbar"><div class="segmented">${['Needs review', 'Verified', 'All'].map(x => button(x, 'compliance-filter', x, { active: s.complianceFilter === x })).join('')}</div></div>
  <div class="split-layout"><div class="panel spacious"><div class="eyebrow">EVIDENCE JOURNEY</div><h2>Leon Ortiz · right to work</h2><p class="lead">The colleague uploads a passport or identity evidence and provides a share code where applicable. An authorised reviewer checks the appropriate official service and records the outcome.</p><div class="timeline"><div>Requested · secure staff link</div><div>Provided · document and code received</div><div>Review · identity and permission checked</div><div>Verified · outcome and expiry recorded</div></div></div>
  <aside class="panel spacious"><div class="eyebrow">DECISION GUIDE</div><h3>Keep each state honest</h3><div class="fact"><span>Uploaded</span><strong>Evidence received</strong></div><div class="fact"><span>Review needed</span><strong>Human check pending</strong></div><div class="fact"><span>Verified</span><strong>Outcome recorded</strong></div><div class="callout">A share code alone cannot prove that a right-to-work check has been completed. No government service is contacted here.</div></aside></div>`;
}

export function learningScreen(s) {
  const lessons = [{ title: 'Welcome to the team', time: '4 min', due: 'Today' }, { title: 'Food safety essentials', time: '7 min', due: 'This week' }, { title: 'Allergen conversations', time: '6 min', due: 'Later' }];
  const current = lessons[s.learningLesson];
  return `${sectionHeading('Learning', 'Short steps that fit around a real shift.', 'FIRST WEEK · PHONE FRIENDLY')}
  <div class="split-layout"><div class="panel spacious"><div class="eyebrow">${current.due.toUpperCase()} · ${current.time.toUpperCase()}</div><h2>${current.title}</h2><p class="lead">${s.learningLesson === 0 ? 'Meet the team, find your first shift and learn where to ask for help.' : s.learningLesson === 1 ? 'Learn the essentials, then complete a short assessment. Practical sign-off remains a separate step.' : 'Practice the correct response to an allergy question and know when to ask a manager.'}</p>
  <div class="learning-art" aria-hidden="true"><span>${s.learningLesson === 0 ? '✳' : s.learningLesson === 1 ? '◈' : '◇'}</span></div>
  <div class="row-actions">${button(s.trainingDone ? 'Preview complete ✓' : 'Mark preview step complete', 'training-done', '', { primary: true })}${s.learningLesson < 2 ? button('Next lesson →', 'learning-lesson', String(s.learningLesson + 1)) : button('Start again', 'learning-lesson', '0')}</div></div>
  <aside class="panel spacious"><div class="eyebrow">YOUR PROGRESS</div><h3>One thing at a time</h3><p>${s.trainingDone ? 'Example step complete' : '1 of 3 short lessons explored'}</p><div class="meter"><span style="width:${s.trainingDone ? 67 : 33}%"></span></div>
  ${lessons.map((x, i) => `<button class="lesson-row ${i === s.learningLesson ? 'selected' : ''}" data-action="learning-lesson" data-value="${i}"><span><strong>${x.title}</strong><small>${x.time} · ${x.due}</small></span><span aria-hidden="true">›</span></button>`).join('')}</aside></div>`;
}

export function absenceScreen() {
  return `${sectionHeading('Absence', 'Make the next step visible without losing context.', 'EXAMPLE CASE · ACCESS DEPENDS ON ROLE')}
  <div class="split-layout"><div class="panel spacious"><div class="eyebrow">SOHO · EXAMPLE CASE</div><h2>Case overview</h2><p class="lead">Keep the dates, contact and follow-up in one private timeline. A review is a human decision, not an automatic score.</p><div class="timeline"><div>Absence reported · 24 Sep</div><div>Check-in due · 26 Sep</div><div>Return conversation · when appropriate</div></div></div><aside class="panel spacious"><div class="eyebrow">NEXT ACTION</div><h3>Check in with care</h3><p>Only authorised colleagues can open sensitive reasons and attachments.</p>${badge('Follow-up due')}</aside></div>`;
}

export function messagesScreen(s) {
  return `${sectionHeading('Messages', 'Relevant reminders, with real delivery status.', 'NO MESSAGES ARE SENT')}
  <div class="toolbar"><div class="segmented">${['Needs attention', 'All activity'].map(x => button(x, 'message-filter', x, { active: s.messageFilter === x })).join('')}</div></div>
  <div class="panel">${workItem('REMINDER · FIRST WEEK', 'Leon’s food safety task', 'A short reminder links straight to the lesson. No duplicate reminder in the same cycle.', 'View learning', 'learning', 'Due soon')}
  ${s.messageFilter === 'All activity' ? `<div class="work-item"><div><div class="eyebrow">DELIVERY</div><h3>Joining invitation</h3><p>Accepted for sending; delivery is still unconfirmed.</p></div>${badge('Sent · not confirmed delivered')}</div>` : ''}</div>
  <div class="callout">The production app should distinguish queued, provider accepted, delivered and failed messages. A “sent” label alone cannot prove arrival.</div>`;
}
