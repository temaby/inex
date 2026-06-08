# Story 10.5a: Frontend UX - Profile And Settings Redesign

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an invited account holder,
I want account settings to be clear, responsive, and trustworthy,
so that profile, currency, language, and password changes are easy to complete on desktop and mobile.

## Acceptance Criteria

1. Given the Profile design reference (`docs/design/Profile.jsx`) and the known mobile overflow issue in `docs/design/docs/design-implementation-guide.md`, when `/profile` is rebuilt, then desktop uses a two-column settings layout, mobile uses horizontal settings tabs, grid children use `min-width: 0`, and there is no page-level horizontal overflow at 390px.
2. Given username, preferred currency, language, and password changes, when the user edits settings, then forms show loading, disabled, success, validation error, and API error states with localized EN/RU text.
3. Given profile forms fail validation, when field or API errors are shown, then errors are associated with fields and no user-visible hardcoded strings bypass i18next.
4. Given the story is complete, when desktop and mobile visual QA runs, then screenshots cover profile overview, profile form error state, and mobile settings tabs.
5. Given the current auth/session architecture, when `/profile` is redesigned, then existing `updateProfile`, `changePassword`, `logoutUser`, `ProtectedRoute`, and `apiClient` behavior is preserved with no route/auth regression.
6. Given Story 10.5b is a sibling auth redesign story, when implementation is complete, then profile redesign does not duplicate auth-shell responsibilities (`/login` and `/register` stay outside `ProtectedRoute` and outside profile scope).

## Tasks / Subtasks

- [x] Rebuild profile/settings page layout and navigation shell usage. (AC: 1, 4, 5)
  - [x] Replace the current narrow single-card profile layout with the design-system settings workspace for `/profile`.
  - [x] Keep `AppShell` wrapper usage and page-level route behavior intact.
  - [x] Implement desktop two-column settings structure with sticky sidebar and main content sections.
  - [x] Implement mobile horizontal settings tab rail (scrollable) and single-column content flow.
- [x] Implement profile account/preferences form states and localization. (AC: 2, 3)
  - [x] Keep existing `updateProfile` dispatch contract (`username`, `currencyId`, `languageCode`).
  - [x] Move hardcoded validation and error strings to locale files.
  - [x] Provide explicit loading, disabled, success, and API error banner states.
  - [x] Ensure language switching keeps current i18n behavior and local storage preference updates.
- [x] Implement password update section UX and validation behavior. (AC: 2, 3)
  - [x] Keep existing `changePassword` dispatch contract (`currentPassword`, `newPassword`).
  - [x] Implement field-level errors and confirm-password match logic using localized strings.
  - [x] Add accessible password strength hint/progress treatment aligned with design direction.
  - [x] Preserve password-manager-friendly attributes (`autoComplete`, semantic names).
- [x] Fix mobile overflow risk and responsive stability explicitly. (AC: 1, 4)
  - [x] Apply `min-width: 0` on grid children and any overflow-prone flex/grid nodes.
  - [x] Verify no horizontal overflow on 390px and 360px in profile/settings sections.
  - [x] Ensure content bottom spacing avoids mobile bottom-nav occlusion.
- [x] Update translation coverage. (AC: 2, 3)
  - [x] Add needed keys to `inex/ClientApp/public/locales/en/translation.json`.
  - [x] Add matching keys to `inex/ClientApp/public/locales/ru/translation.json`.
  - [x] Remove newly introduced hardcoded UI labels in touched profile/settings files.
- [x] Validate implementation quality gates. (AC: 4, 5)
  - [x] Run `npm run build` from `inex/ClientApp`.
  - [x] Run `npm run lint` from `inex/ClientApp`.
  - [x] Capture visual QA screenshots for desktop profile overview, desktop error state, and mobile tabs state.

## Prerequisites

- Story 10.1a (tokens/theme bridge) is mandatory before starting this story so profile/settings surfaces use the Epic 10 CSS variable and Ant Design theme bridge instead of local color constants.
- Story 10.1b (shared primitives) is mandatory before starting this story so settings actions, empty/help states, error banners, and icon buttons align with the shared primitive contracts.
- Story 10.1c (app shell/navigation) is mandatory before starting this story. `/profile` must be rebuilt inside the implemented authenticated app shell/navigation contract, including mobile bottom-nav spacing and no page-level horizontal overflow at 390px and 360px.
- Story 10.1d fixes the shell account-control policy for this story: production may keep the separate visible sign-out icon as an accepted mockup deviation, while the profile pill remains the profile/settings entry point. This story owns `/profile` content and settings behavior; it must not move logout behind the profile pill or remove the sign-out affordance unless a later shell story explicitly changes that policy.
- Story 10.4 is a sequencing prerequisite for this story unless the team explicitly waives the fixed Epic 10 order in the story handoff. Profile/settings should be rebuilt after dashboard/reports route chrome is stable so app-shell navigation and `/dashboard` landing behavior are not reworked in parallel.

## Profile/Settings Validation Matrix

| Scenario | Given | When | Then |
| --- | --- | --- | --- |
| Profile save success | The authenticated user edits username, preferred currency, or language | `updateProfile({ username, currencyId, languageCode })` resolves | The form exits loading/disabled state, localized success feedback is shown, Redux user state is updated from the returned `/auth/me` data, and the visible form reflects the saved values |
| Profile save failure | The authenticated user submits invalid or rejected profile data | `updateProfile` rejects with validation or API error details | The form exits loading/disabled state, a localized field error or API error banner/message is shown, values remain editable, and no hardcoded fallback text is rendered |
| Password change success | The authenticated user submits current password and matching valid new password fields | `changePassword({ currentPassword, newPassword })` resolves | The password form exits loading/disabled state, localized success feedback is shown, and password fields are cleared without changing route/session state |
| Password change failure | The password form has mismatched fields, short password, wrong current password, or backend rejection | Client validation fails or `changePassword` rejects | Field-level localized validation appears for client errors; localized API error feedback appears for backend errors; the submit button re-enables and password-manager-friendly attributes remain intact |
| Stale session / 401 | The access token is stale or the refresh/session cookie is no longer valid | A profile-owned `apiClient` request such as `/currencies`, `updateProfile`, or `changePassword` receives 401 | Existing `apiClient`/auth handling remains the only session path, protected-route behavior is preserved, and the profile redesign does not introduce a second HTTP client or custom stale-session redirect |
| Language persistence | The authenticated user changes language in profile/settings | Profile save succeeds and `applyLanguage`/i18n state updates from returned user data | `i18n.language` and `localStorage` language preference remain consistent with the saved `languageCode`, and a reload restores the same locale |

## Dev Notes

### Story Intelligence From Planning Artifacts

- Epic 10 covers FR-UX-001 through FR-UX-007 and this story maps directly to FR-UX-006 (profile/settings + auth redesign quality requirements). [Source: `docs/planning/epics.md`]
- Visual QA must explicitly cover 1440px desktop and 390px/360px mobile checks for profile/settings. Use shared primitives from Story 10.1b; do not create profile-local replacements for shared action, empty/help, icon-button, or error-banner contracts.
- The design update plan identifies profile as a known gap with explicit mobile overflow risk; this story is responsible for eliminating that risk in production UI, not mockup only. [Source: `docs/planning/design-update-plan.md`]
- UX planning explicitly points to three sources to combine for implementation quality: design implementation guide, design update plan, and Epic 10 story criteria. [Source: `docs/planning/ux-design.md`]
- PRD aligns FR-UX-006 with production validation/loading/error state expectations and i18n correctness, so redesign is not visual-only. [Source: `docs/planning/prds/prd-inex-2026-05-20/prd.md`]

### Current State Analysis (Files Being Updated)

- `inex/ClientApp/src/pages/Profile.tsx` currently renders one `Card` inside `BasicPage` with `maxWidth: 480`, which does not match target desktop two-column settings layout and is prone to mobile constraints/overflow issues under richer content.
- The current profile page includes hardcoded user-facing strings in validation and fallback API errors:
  - `"Username is required"`
  - `"At least 8 characters"`
  - `"Confirm New Password"`
  - `"Passwords do not match"`
  - `"Failed to update profile."`
  - `"Failed to change password."`
    These violate NFR-I18N-1 for touched flows and must be localized.
- Profile data update flow already exists and must be preserved:
  - `dispatch(updateProfile({ username, currencyId, languageCode }))`
  - `dispatch(changePassword({ currentPassword, newPassword }))`
  - currency list loaded via `apiClient.get("/currencies")`
  - success feedback currently via `message.success`.
- Existing auth routes and protected layout behavior in `inex/ClientApp/src/App.tsx` are correct and should remain unchanged for this story:
  - `/login`, `/register` are public.
  - `/profile` is inside `ProtectedRoute`.

### Design And UX Guardrails

- Preserve Story 10.1d shell decisions:
  - Dashboard remains visible in authenticated desktop and mobile navigation as an accepted production IA deviation from the five-item mockup management nav.
  - The profile pill and separate sign-out icon may both remain visible in the app shell.
  - Profile access and logout must remain keyboard reachable on desktop and reachable on mobile after any `/profile` page changes.
- Desktop settings layout contract:
  - settings container uses wide workspace padding and two-column grid (`sidebar + content`).
  - sidebar is sticky under top nav.
  - content uses card sections with clear grouping.
- Mobile settings layout contract:
  - collapse to one column.
  - sidebar becomes horizontal scroll tabs.
  - internal two-column grids collapse to one column.
  - include bottom spacing so mobile bottom nav does not cover content.
- Explicit overflow prevention (non-negotiable):
  - use `min-width: 0` on grid/flex children in settings containers.
  - ensure controls and labels can shrink/wrap instead of forcing viewport expansion.
- Form UX contract:
  - field-level validation, API error banner, success state, loading/disabled states.
  - proper label-input association via Ant Design `Form.Item`.
  - no hardcoded visible copy in touched scope.

### Architecture Compliance Requirements

- Keep frontend architecture unchanged:
  - continue Redux thunks and existing auth slice (`auth-actions.ts`, `auth-slice.ts`).
  - keep `apiClient` usage for HTTP calls.
  - do not introduce RTK Query or alternate form/state architecture in this story.
- Keep route and shell boundaries unchanged:
  - `/profile` remains authenticated route.
  - no changes to `/login` and `/register` route ownership in this story.
- Preserve existing backend API contracts:
  - no request/response schema changes for profile/password endpoints.
  - no changes to backend validators/controllers for this frontend redesign story.

### File Structure Requirements

Recommended touched files for this story:

- `inex/ClientApp/src/pages/Profile.tsx` (primary rebuild target)
- `inex/ClientApp/src/pages/Profile.css` or `inex/ClientApp/src/pages/Profile/profile.css` (new profile-specific styles if needed)
- `inex/ClientApp/public/locales/en/translation.json` (new profile/settings/auth state text keys)
- `inex/ClientApp/public/locales/ru/translation.json` (RU equivalents)

Optional additive helpers (if implementation chooses modular split):

- `inex/ClientApp/src/pages/Profile/ProfileSidebar.tsx`
- `inex/ClientApp/src/pages/Profile/ProfileAccountSection.tsx`
- `inex/ClientApp/src/pages/Profile/ProfilePasswordSection.tsx`

Files to avoid changing unless strictly necessary:

- `inex/ClientApp/src/App.tsx` (no route-ownership changes expected)
- `inex/ClientApp/src/components/ProtectedRoute.tsx`
- `inex/ClientApp/src/store/auth/*` (only use existing APIs)

### Library And Framework Requirements

- Use existing stack only (React 18, TypeScript strict, Ant Design 5, Redux Toolkit, i18next).
- For icons in new profile controls, prefer existing project icon approach (`lucide-react` already introduced by Epic 10 prerequisite stories) rather than new icon dependencies.
- Keep accessibility behavior aligned with design guide requirements:
  - keyboard reachable tabs/segmented controls,
  - screen-reader-friendly icon actions,
  - focus-visible states.

### Testing And Verification Requirements

- Required command checks from `inex/ClientApp`:
  - `npm run build`
  - `npm run lint`
- Manual responsive checks:
  - Desktop profile overview.
  - Desktop profile error state.
  - Mobile settings tabs at 390px.
  - Mobile overflow check at 390px and 360px.
- Visual QA outputs (minimum for AC):
  - profile overview screenshot,
  - profile form error state screenshot,
  - mobile settings tabs screenshot.

### Previous Story Intelligence

- Story 10.3b (Categories redesign) established useful implementation discipline for Epic 10 page rebuilds:
  - keep Redux data contracts stable,
  - isolate visual rebuild in page components/styles,
  - enforce no-overflow responsive checks and explicit screenshot states,
  - avoid broad architecture migrations in page redesign stories.
    Apply the same discipline here.
- Story 10.5b (Login/Register redesign) is already contexted (`ready-for-dev`) and carries sibling constraints:
  - auth-shell responsibilities stay in auth routes,
  - profile story must not duplicate or conflict with `/login` and `/register` layout ownership.
  - If 10.5a and 10.5b proceed in parallel, coordinate `en/translation.json` and `ru/translation.json` edits by reserving non-overlapping key names, rebasing before locale edits, and verifying the final locale files contain both profile/settings keys and auth-form keys before either story is marked done.

### Git Intelligence Summary (Recent Repository History)

Recent commit titles:

1. `117430a` - story 1.5: verify frontend build artifacts are not tracked (#129)
2. `dde85c8` - Story 1.4: externalize local secret config (#128)
3. `cfe865c` - fix(accounts): include key in account update payload (#127)
4. `2937892` - Story 1 1 owned delete not found cleanup (#126)
5. `cfbe606` - Normalize owned delete not-found handling (#125)

Implications for this story:

- Recent repo work focused on backend/security hygiene; Epic 10 profile redesign should remain frontend-scoped and low-risk.
- Keep regression risk down by preserving auth/session contracts and route behavior while changing layout/UX.

### Latest Technical Context

- React Router v6 route composition in `App.tsx` already cleanly separates public auth routes from authenticated app routes; keep this boundary unchanged.
- Ant Design Form validation + `Form.Item` label wiring already supports accessible error association; leverage this instead of custom validation rendering.
- i18next is already configured app-wide; all new user-visible strings must be added to EN/RU translations and referenced via `t(...)`.

### Project Structure Notes

- Frontend page files live under `inex/ClientApp/src/pages`.
- Shared layout shell for authenticated routes is already in use in the pages layer; profile redesign should conform to existing shell pattern.
- Locale files are centralized under `inex/ClientApp/public/locales/{en,ru}/translation.json`.

### Project Context Reference

- Keep frontend API calls on the shared `apiClient`; do not create new raw clients. [Source: `docs/project-context.md`]
- Do not introduce new `any` in touched TypeScript files; maintain strict typing. [Source: `docs/project-context.md`]
- Keep all user-visible strings in i18n dictionaries for EN/RU. [Source: `docs/project-context.md`]
- Converted routes must pass mobile overflow checks at 390px and 360px. [Source: `docs/project-context.md`]

### References

- `docs/planning/epics.md` (Epic 10, Story 10.5a definition and AC)
- `docs/planning/design-update-plan.md` (profile gap and sequence)
- `docs/planning/ux-design.md` (UX source mapping)
- `docs/planning/prds/prd-inex-2026-05-20/prd.md` (FR-UX-006, NFR UX/I18N context)
- `docs/design/docs/design-implementation-guide.md` (sections 8, 10, 13, 14)
- `docs/design/Profile.jsx` (reference behavior and layout)
- `docs/design/responsive.css` (mobile settings and auth responsive hooks)
- `inex/ClientApp/src/pages/Profile.tsx` (current implementation baseline)
- `inex/ClientApp/src/pages/Login.tsx` and `inex/ClientApp/src/pages/Register.tsx` (boundary context with sibling story)
- `inex/ClientApp/src/App.tsx` (route ownership and protection boundaries)
- `inex/ClientApp/public/locales/en/translation.json` and `inex/ClientApp/public/locales/ru/translation.json` (i18n coverage baseline)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- 2026-06-08: Used isolated worktree `D:\work\inex\.worktrees\10-5a-profile-settings-redesign` from `origin/master` because the main checkout was dirty with other story work.
- 2026-06-08: RED test added in `Profile.test.tsx`; initial run failed against the old single-card page due missing settings title/tab/field contracts.
- 2026-06-08: Browser visual QA used Vite on port 3005 plus a temporary local mock API on port 5000 to preserve protected-route behavior without backend changes.
- 2026-06-08: PR #187 follow-up RED tests covered field-associated API validation errors and section-navigation semantics before patching `Profile.tsx`.

### Completion Notes List

- Story context created via bmad-create-story workflow for key `10-5a-frontend-ux-profile-and-settings-redesign`.
- Sprint status target for this story updated to `ready-for-dev`.
- Story includes comprehensive implementation guardrails for layout, responsive behavior, i18n, route boundaries, and verification.
- Ultimate context engine analysis completed - comprehensive developer guide created.
- Rebuilt `/profile` into a settings workspace with sticky desktop sidebar, account/security tab rail, overview metrics, two-column content sections, and mobile single-column flow.
- Preserved existing `BasicPage`/`AppShell`, `ProtectedRoute`, `apiClient`, `updateProfile`, `changePassword`, and language-application contracts; no login/register/auth-shell implementation changed.
- Added localized profile/settings validation, success, loading/disabled, API banner, password confirmation, and password-strength UX.
- Added profile-focused Vitest coverage for settings workspace rendering, thunk payload contracts, localized confirm-password validation, and hardcoded confirm-label regression.
- Captured visual QA artifacts under `docs/implementation/visual-qa/10-5a`; 390px and 360px browser metrics report `overflowX: false` and are labeled `dataMode: fixture`.
- Addressed PR #187 review feedback by mapping profile/password API validation codes and known identity/password domain errors onto form fields with localized messages, converting the scroll rail from ARIA tabs to section navigation, and labeling QA evidence data mode.

### File List

- docs/implementation/10-5a-frontend-ux-profile-and-settings-redesign.md
- docs/implementation/sprint-status.yaml
- docs/implementation/visual-qa/10-5a/profile-form-error-1440.png
- docs/implementation/visual-qa/10-5a/profile-mobile-tabs-360.png
- docs/implementation/visual-qa/10-5a/profile-mobile-tabs-390.png
- docs/implementation/visual-qa/10-5a/profile-overview-1440.png
- docs/implementation/visual-qa/10-5a/qa-summary.json
- inex/ClientApp/public/locales/en/translation.json
- inex/ClientApp/public/locales/ru/translation.json
- inex/ClientApp/src/pages/Profile.css
- inex/ClientApp/src/pages/Profile.test.tsx
- inex/ClientApp/src/pages/Profile.tsx

### Change Log

- 2026-06-08: Implemented Story 10.5a profile/settings redesign; added profile-local responsive styles, tests, locale keys, and visual QA artifacts.
- 2026-06-08: Addressed PR #187 requested changes for field-associated API validation errors, accessible section navigation semantics, and visual QA `dataMode` metadata.
