# End-to-end tests

These run against a real dev server (started automatically by
`npm run test:e2e`) and a real Supabase backend — there's no mocking layer,
by design, so they catch RLS/schema issues that mocked tests would hide.

**Before running:**
1. `.env.local` must point at a real (ideally a dedicated *test*, not
   production) Supabase project with all migrations + seed data applied.
2. Tests marked "requires auth" expect a test user to already exist. Create
   one and set its credentials as env vars:
   ```bash
   export E2E_TEST_EMAIL=test@example.com
   export E2E_TEST_PASSWORD=testpassword123
   ```
   (Create this user via Supabase Auth in the dashboard, or sign up through
   the app once manually.)
3. Stripe/email flows are NOT covered here — those need webhook delivery
   that a local Playwright run can't receive. Test them manually against
   Stripe's test mode, or with the Stripe CLI's `stripe listen --forward-to`.

**Run:** `npm run test:e2e` (add `--ui` for Playwright's interactive runner).
