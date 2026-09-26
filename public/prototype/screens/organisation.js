import { badge, button, sectionHeading, metric } from '../ui.js';

export function reportsScreen() {
  return `${sectionHeading('Reports', 'Useful numbers with their source and freshness.', 'EXAMPLE ONLY · NOT FINANCIAL ADVICE')}
  <div class="metrics">${metric('TIME REVIEWED', '12 / 14', 'Two entries still pending')}${metric('HOLIDAY', 'Pending', 'One request to decide')}${metric('SALES SYNC', 'Unavailable', 'Last successful sync unknown', 'caution')}</div>
  <div class="split-layout"><div class="panel spacious"><div class="eyebrow">OPERATIONS</div><h2>See what is ready</h2><p class="lead">A missing source is shown as unavailable rather than £0. Reports say when a number is an estimate and when it has been approved.</p><div class="fact"><span>Timesheet coverage</span><strong>Partial · 12 of 14</strong></div><div class="fact"><span>Payroll period</span><strong>Draft · not approved</strong></div><div class="fact"><span>Sales</span><strong>Unavailable</strong></div></div><aside class="panel spacious"><div class="eyebrow">WHAT TO TRUST</div><h3>Every number needs context</h3><p>Source, period, location and freshness belong beside the figure, including on a phone.</p><div class="callout">No export or decision based on incomplete inputs is available in the prototype.</div></aside></div>`;
}

export function recruitmentScreen() {
  return `${sectionHeading('Hiring', 'Know the next owner of every application.', 'FICTIONAL APPLICATIONS')}
  <div class="metrics">${metric('NEW', '2', 'Awaiting first review')}${metric('INTERVIEW', '1', 'Schedule to confirm')}${metric('OFFER', '1', 'Handover to joining')}</div>
  <div class="panel">${[['Application received', 'Candidate A', 'New'], ['Conversation scheduled', 'Candidate B', 'Interview'], ['Offer accepted', 'Candidate C', 'Move to joining']].map(([stage,name,status]) => `<div class="work-item"><div><div class="eyebrow">${stage}</div><h3>${name}</h3><p>Candidate information stays separate from staff records until a joining handover.</p></div>${badge(status)}</div>`).join('')}</div>`;
}

export function locationsScreen(s) {
  return `${sectionHeading('Locations', 'Keep the right team in the right place.', 'EXAMPLE WORKSPACE')}
  <div class="panel">${[['Soho', '2 current colleagues', 'No upcoming moves'], ['Carnaby', '1 current · 1 joining', 'One shift needs cover'], ['Shoreditch', '1 current colleague', 'Overnight shift scheduled']].filter(([name]) => s.location === 'All locations' || s.location === name).map(([name,count,note]) => `<div class="work-item"><div><div class="eyebrow">LOCATION</div><h3>${name}</h3><p>${count} · ${note}</p></div>${badge('Open')}</div>`).join('')}</div><div class="callout neutral">A future move should show its effective date and keep historical payroll and rota assignments intact.</div>`;
}

export function settingsScreen(s) {
  return `${sectionHeading('Settings', 'Understand access without guessing.', 'DESIGN EXAMPLE · NOT A SECURITY CONTROL')}
  <div class="split-layout"><div class="panel spacious"><div class="eyebrow">CURRENT VIEW</div><h2>${s.role} · ${s.location}</h2><p class="lead">The preview’s role and location switches demonstrate how navigation and context could feel. They do not grant permissions in the real application.</p><div class="fact"><span>Access</span><strong>Check on every real request</strong></div><div class="fact"><span>Permission read fails</span><strong>Do not show protected actions</strong></div><div class="fact"><span>Workspace changes</span><strong>Clear old workspace results</strong></div></div><aside class="panel spacious"><div class="eyebrow">CONNECTION HEALTH</div><h3>Make failures actionable</h3><div class="fact"><span>Payroll provider</span><strong>Not connected in preview</strong></div><div class="fact"><span>Email delivery</span><strong>Not connected in preview</strong></div><div class="fact"><span>Rota sync</span><strong>Not connected in preview</strong></div>${button('Explore reports →', 'navigate', 'reports')}</aside></div>`;
}
