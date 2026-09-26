// Entirely invented examples. This module has no production imports or network requests.
export const sections = [
  { id: 'home', label: 'Home', group: 'Overview', icon: '⌂' },
  { id: 'people', label: 'People', group: 'People', icon: '◉' },
  { id: 'joining', label: 'Joining', group: 'People', icon: '✳' },
  { id: 'contracts', label: 'Contracts', group: 'People', icon: '▤' },
  { id: 'rota', label: 'Rota', group: 'Work', icon: '▦' },
  { id: 'timesheets', label: 'Timesheets', group: 'Work', icon: '◷' },
  { id: 'holiday', label: 'Holiday', group: 'Work', icon: '☀' },
  { id: 'payroll', label: 'Payroll', group: 'Money', icon: '£' },
  { id: 'reports', label: 'Reports', group: 'Money', icon: '◫' },
  { id: 'compliance', label: 'Documents', group: 'Care', icon: '◇' },
  { id: 'learning', label: 'Learning', group: 'Care', icon: '◎' },
  { id: 'absence', label: 'Absence', group: 'Care', icon: '✚' },
  { id: 'messages', label: 'Messages', group: 'Connect', icon: '✉' },
  { id: 'recruitment', label: 'Hiring', group: 'Connect', icon: '⊕' },
  { id: 'locations', label: 'Locations', group: 'Setup', icon: '⌖' },
  { id: 'settings', label: 'Settings', group: 'Setup', icon: '⚙' },
];

export const people = [
  { id: 'maya', name: 'Maya Chen', initials: 'MC', role: 'Front of house', location: 'Soho', status: 'Active', colour: 'mint', progress: 100 },
  { id: 'leon', name: 'Leon Ortiz', initials: 'LO', role: 'Kitchen', location: 'Carnaby', status: 'Joining', colour: 'peach', progress: 60 },
  { id: 'ava', name: 'Ava Morgan', initials: 'AM', role: 'Supervisor', location: 'Soho', status: 'Active', colour: 'lavender', progress: 100 },
  { id: 'noor', name: 'Noor Patel', initials: 'NP', role: 'Front of house', location: 'Shoreditch', status: 'Active', colour: 'blue', progress: 100 },
  { id: 'eli', name: 'Eli Brooks', initials: 'EB', role: 'Kitchen', location: 'Carnaby', status: 'Former', colour: 'stone', progress: 100 },
];

export const locations = ['All locations', 'Soho', 'Carnaby', 'Shoreditch'];
export const joiningSteps = ['Invite', 'Staff details', 'Manager checks', 'Contract', 'First week'];
export const payrollSteps = ['Prepare', 'Review', 'Approval', 'Share'];

export function initialState() {
  return {
    page: 'home', role: 'Manager', location: 'All locations', device: 'Desktop',
    search: '', peopleFilter: 'Active', selectedPerson: null,
    joiningStep: 2, payrollStep: 1, payrollAcknowledged: false,
    holidayFilter: 'Current team', holidayReviewed: false,
    rotaFilter: 'This week', timesheetFilter: 'Needs review',
    contractStage: 1, complianceFilter: 'Needs review', learningLesson: 0,
    trainingDone: false, messageFilter: 'Needs attention',
    notice: '', theme: 'light', navOpen: false,
  };
}
