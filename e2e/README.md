# Playwright E2E Testing

## Quick start

```bash
# 1. Install Playwright browsers (one-time)
npx playwright install

# 2. Set up credentials
cp .env.test.example .env.test
# Edit .env.test with a valid test account

# 3. Run tests
npm run test:e2e            # headless, all browsers
npm run test:e2e:headed     # headed (watch the browser)
npm run test:e2e:ui         # interactive Playwright UI
```

## Required environment variables

| Variable             | Required | Default                   |
| -------------------- | -------- | ------------------------- |
| `BASE_URL`           | No       | `http://localhost:5173`   |
| `E2E_USER_EMAIL`     | Yes*     | —                         |
| `E2E_USER_PASSWORD`  | Yes*     | —                         |

\* Without credentials, authenticated tests will assert redirect to `/auth` instead of verifying page content.

## Lovable limitations

Playwright requires system-level browser binaries (`npx playwright install`).  
Tests **cannot** run inside Lovable's preview — clone the repo and run locally or in CI.

## Test structure

```
e2e/
├── .auth/              # storageState (git-ignored)
├── auth.setup.ts       # logs in & saves session
├── homepage.spec.ts    # public page smoke tests
├── auth.spec.ts        # login form & redirect guards
├── navigation.spec.ts  # protected routes (/employees, /schedule, /payroll)
└── mobile-nav.spec.ts  # mobile viewport navigation
```
