import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';

const root = new URL('../../public/prototype/', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const dom = new JSDOM(html, { url: 'https://example.test/prototype/', pretendToBeVisual: true });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.fetch = () => { throw new Error('Prototype attempted a network request'); };
await import(new URL('app.js', root));

function click(action, value) {
  const element = [...document.querySelectorAll(`[data-action="${action}"]`)].find(x => (x.dataset.value || '') === value);
  assert.ok(element, `Missing ${action} ${value}`);
  element.click();
}
function change(id, value) {
  const picker = document.getElementById(id);
  picker.value = value;
  picker.dispatchEvent(new window.Event('change', { bubbles: true }));
}
const text = () => document.querySelector('main').textContent;

test('all sixteen sections are navigable with a clear heading', () => {
  const ids = ['home', 'people', 'joining', 'contracts', 'rota', 'timesheets', 'holiday', 'payroll', 'reports', 'compliance', 'learning', 'absence', 'messages', 'recruitment', 'locations', 'settings'];
  for (const id of ids) {
    click('navigate', id);
    assert.ok(document.querySelector('main h1')?.textContent);
    assert.equal(document.querySelector(`[data-action="navigate"][data-value="${id}"]`)?.getAttribute('aria-current'), 'page');
  }
});

test('people search, location and former colleague history do not become current leave', () => {
  click('navigate', 'people');
  click('people-filter', 'Former');
  assert.match(text(), /Eli Brooks/);
  assert.doesNotMatch(text(), /Maya Chen/);
  click('navigate', 'holiday');
  assert.doesNotMatch(text(), /Eli Brooks/);
  click('holiday-filter', 'History');
  assert.match(text(), /Eli Brooks/);
  change('location-picker', 'Carnaby');
  click('navigate', 'people');
  assert.match(text(), /Eli Brooks/);
  change('location-picker', 'Soho');
  assert.doesNotMatch(text(), /Eli Brooks/);
  change('location-picker', 'All locations');
  click('people-filter', 'All');
  const input = document.querySelector('[data-input="search"]');
  input.value = 'Maya';
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.match(text(), /Maya Chen/);
  assert.doesNotMatch(text(), /Leon Ortiz/);
  click('person', 'maya');
  assert.match(text(), /Approved information stays on file/);
});

test('payroll blockers remain visible and no approval mutation exists', () => {
  click('navigate', 'payroll');
  click('payroll-step', '2');
  assert.match(text(), /Approval is unavailable while review blockers remain/);
  assert.equal(document.querySelector('[data-action="approve"]'), null);
  click('payroll-step', '3');
  click('payroll-ack', '');
  assert.match(document.querySelector('#notice').textContent, /No payroll record changed/);
});

test('joining and learning stages work with local-only progress', () => {
  click('navigate', 'joining');
  click('joining-step', '1');
  assert.match(text(), /Bank details, NI status/);
  click('joining-step', '4');
  assert.match(text(), /Day 5/);
  click('navigate', 'learning');
  click('learning-lesson', '1');
  assert.match(text(), /Food safety essentials/);
  click('training-done', '');
  assert.match(document.querySelector('#notice').textContent, /No training record was changed/);
});

test('staff preview hides manager-only navigation and former colleague records', () => {
  change('role-picker', 'Staff');
  assert.equal(document.querySelector('[data-action="navigate"][data-value="payroll"]'), null);
  assert.equal(document.querySelector('[data-action="navigate"][data-value="joining"]'), null);
  click('navigate', 'holiday');
  assert.doesNotMatch(text(), /Eli Brooks/);
  assert.equal(document.querySelector('[data-action="holiday-filter"][data-value="History"]'), null);
  click('navigate', 'rota');
  assert.doesNotMatch(text(), /Leon Ortiz/);
  change('role-picker', 'Manager');
  assert.equal(document.querySelector('[data-action="navigate"][data-value="payroll"]'), null);
  assert.equal(document.querySelector('[data-action="navigate"][data-value="contracts"]'), null);
  change('role-picker', 'Admin');
});

test('phone, theme and reset switches restore the starting state', () => {
  click('device', '');
  assert.ok(document.querySelector('.phone-frame'));
  click('theme', '');
  assert.equal(document.documentElement.dataset.theme, 'dark');
  click('reset', '');
  assert.equal(document.documentElement.dataset.theme, 'light');
  assert.ok(!document.querySelector('.phone-frame'));
  assert.equal(document.querySelector('main h1').textContent, 'Good morning.');
});

test('prototype modules have no production SDK or networking imports', () => {
  const files = ['app.js', 'data.js', 'ui.js', ...readdirSync(new URL('screens/', root)).map(x => `screens/${x}`)];
  for (const file of files) {
    const source = readFileSync(new URL(file, root), 'utf8');
    assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|supabase|\.\.\/\.\.\/src\//i, file);
  }
  assert.match(html, /\.\/app\.js/);
});
