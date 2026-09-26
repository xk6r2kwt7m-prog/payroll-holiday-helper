# Workspace visual prototype

`workspace-preview.html` is a self-contained HTML fragment for reviewing a proposed shared visual direction. It is deliberately outside the application entry points and is not a production route.

Screens: Home, Employees and Payroll. Switch between desktop and a narrow phone frame; search/filter the synthetic directory; open a synthetic profile; navigate payroll stages; try the simulated acknowledgement interaction. On narrow screens the tables become stacked rows. All data is fictional and the payroll example totals £1,448 for 96 hours.

The prototype makes no network requests and has no connection to Supabase, authentication, staff records, payroll or email. Buttons that would require a business operation show an explanatory message only. It does not replace or validate any live approval rules.

Design: charcoal navigation, stronger teal controls, neutral surfaces, larger headings, visible labels and responsive layouts. Product colour pairs adapt to the browser colour scheme. Supporting calculations sit in a disclosure; essential next actions stay visible.

Verification: exercised navigation, name search, status filtering, profile open/close, phone-frame switching and acknowledgement messages using JSDOM. No script errors were observed. This is an interaction smoke check, not a browser layout or assistive-technology audit. The production application was not modified and its tests were not rerun for this standalone prototype.

Before production integration: review rendered phone/desktop and light/dark appearances, check keyboard focus and real status/error states, then migrate shared styles in separately scoped changes. Do not carry synthetic records or the simplified payroll example into production business logic.
