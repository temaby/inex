# Story 1.3: Fix Account Update Returns 422

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user editing an account,
I want saving account changes to succeed,
so that I can rename, describe, or enable/disable accounts from the UI.

## Acceptance Criteria

1. Given a user opens an existing account and changes its name or description, when they submit the edit form, then the update succeeds with `200 OK`, Redux account data is refreshed, and the updated values are visible immediately without a `422` validation response.
2. Given the current root cause is that `updateAccount` in `inex/ClientApp/src/store/accounts/accounts-actions.ts` omits `key`, when the fix is applied, then `PUT /api/accounts/{id}` sends a request body containing `id`, `key`, `name`, `description`, `currencyId`, and `isEnabled`.
3. Given `AccountUpdateValidator` includes `AccountCreateValidator`, when the update request reaches the backend, then the existing `key.required`, `name.required`, `name.max_length`, and `currency_id.invalid` validation rules remain intact. The backend validator must not be weakened to make the frontend omission pass.
4. Given the user edits only display fields, when the update request is built, then the existing account `key` is preserved unless the UI explicitly supports editing it. Renaming an account must not silently regenerate or mutate `key`.
5. Given the story is complete, when `npm run build` and `npm run lint` run from `inex/ClientApp`, then both pass with no new TypeScript, lint, or dependency errors.

## Tasks / Subtasks

- [ ] Fix the account update payload. (AC: 1, 2, 4)
  - [ ] Update `updateAccount` in `inex/ClientApp/src/store/accounts/accounts-actions.ts` to accept `key: string`.
  - [ ] Include `key` in the `apiClient.put(`${API_BASE}/${id}`, ...)` request body.
  - [ ] Keep the existing `apiClient`, `parseAxiosError`, `setIsUpdating`, `setLastUpdate`, and `finally` loading-state pattern.
- [ ] Pass the existing account key from the edit form. (AC: 1, 2, 4)
  - [ ] In `inex/ClientApp/src/pages/Accounts/AccountEditForm.tsx`, pass `props.record.key` to `updateAccount`.
  - [ ] Preserve the current edit surface: name, description, currency, and enabled/disabled status. Do not add a key field unless product requirements explicitly ask for key editing.
  - [ ] If `AccountEditForm` is touched beyond the call site, replace touched `any` usage with the existing `AccountDetails` type and a small reducer-action union rather than adding new `any`.
- [ ] Preserve backend validation and contracts. (AC: 2, 3)
  - [ ] Do not change `inex.Services/Validators/Account/AccountUpdateValidator.cs`.
  - [ ] Do not remove `Include(new AccountCreateValidator())`.
  - [ ] Do not change `CreateAccountRequest`, `UpdateAccountRequest`, `AccountResponse`, route names, JSON property names, or response status semantics for this story.
- [ ] Optional focused backend regression coverage only if useful. (AC: 3)
  - [ ] Existing `inex.Tests/Accounts/AccountsControllerTests.cs` already proves a valid update succeeds when `key` is present.
  - [ ] Add or extend validation coverage only if the implementation touches backend validation or contract files. This story should normally be frontend-only.
- [ ] Run required verification. (AC: 5)
  - [ ] From `D:\work\inex\inex\ClientApp`, run `npm run build`.
  - [ ] From `D:\work\inex\inex\ClientApp`, run `npm run lint`.
  - [ ] If backend files are changed despite the intended scope, also run `dotnet build inex.sln` and `dotnet test inex.sln` from `D:\work\inex`.
  - [ ] Smoke-check the Accounts edit flow in the UI or through the network request: the `PUT /api/accounts/{id}` payload must include the original `key` and return `200 OK`.

## Dev Notes

### Current State Analysis

- `createAccount` already sends `{ key, name, description, currencyId, isEnabled }` to `POST /api/accounts`. This is why account creation satisfies `AccountCreateValidator`. [Source: `inex/ClientApp/src/store/accounts/accounts-actions.ts`]
- `updateAccount` currently accepts `(id, name, description, currencyId, isEnabled)` and sends `{ id, name, description, currencyId, isEnabled }` to `PUT /api/accounts/{id}`. The missing `key` causes backend validation to return `422`. [Source: `inex/ClientApp/src/store/accounts/accounts-actions.ts`]
- `AccountEditForm.updateHandler` dispatches `updateAccount(+props.record.id, state.name, state.description, state.currencyId, state.isEnabled)`. The expanded-row `record` already comes from account list data and includes `key` through `AccountDetails` inheriting from `ItemDetails`. [Source: `inex/ClientApp/src/pages/Accounts/AccountEditForm.tsx`; `inex/ClientApp/src/model/Account/AccountDetails.ts`; `inex/ClientApp/src/model/Base/ItemDetails.ts`]
- `AccountCreateValidator` requires `Key`, `Name`, and valid `CurrencyId`. `AccountUpdateValidator` includes `AccountCreateValidator` and also requires a positive `Id`. This is intentional and should stay unchanged. [Source: `inex.Services/Validators/Account/AccountCreateValidator.cs`; `inex.Services/Validators/Account/AccountUpdateValidator.cs`]
- `UpdateAccountRequest` inherits `CreateAccountRequest`, so backend model binding expects the same account fields plus `Id`. `AccountMapper.ApplyTo` copies `Key` onto the entity during update, so the frontend must send the current key to preserve it. [Source: `inex.Services/Models/Records/Account/UpdateAccountRequest.cs`; `inex.Services/Models/Mappers/AccountMapper.cs`]
- `Accounts.tsx` refreshes account data when `accounts.lastUpdate` changes and collapses expanded rows. `updateAccount` must keep dispatching `setLastUpdate()` after a successful PUT so the UI reflects the saved data immediately. [Source: `inex/ClientApp/src/pages/Accounts.tsx`; `inex/ClientApp/src/store/accounts/accounts-slice.ts`]

### Recommended Implementation Shape

Keep the change small and explicit:

```ts
export const updateAccount = (
  id: number,
  key: string,
  name: string,
  description: string,
  currencyId: number,
  isEnabled: boolean
) => {
  return async (dispatch: AppDispatch) => {
    try {
      dispatch(accountsActions.setIsUpdating({ isUpdating: true }));
      await apiClient.put(`${API_BASE}/${id}`, { id, key, name, description, currencyId, isEnabled });
      dispatch(accountsActions.setLastUpdate());
    } catch (error) {
      dispatch(accountsActions.setError(parseAxiosError(error, "Could not update account")));
    } finally {
      dispatch(accountsActions.setIsUpdating({ isUpdating: false }));
    }
  };
};
```

Then update the edit form call site:

```ts
dispatch(updateAccount(
  +props.record.id,
  props.record.key,
  state.name,
  state.description,
  state.currencyId,
  state.isEnabled
));
```

If the dev agent types `AccountEditForm`, use:

- `AccountDetails` for `record`.
- A narrow `AccountEditAction` union for reducer actions.
- No new broad `any`, no route/model reshaping, and no new dependency.

### Anti-Patterns To Avoid

- Do not weaken `AccountUpdateValidator` or remove the inherited `key.required` rule.
- Do not regenerate `key` from the edited account name. That would make a rename silently change a stable account identifier.
- Do not create a new Axios instance, use `fetch`, or bypass `apiClient`; it owns auth headers and refresh-token retry behavior.
- Do not migrate accounts to RTK Query in this story. Epic 7 tracks that broader frontend data ownership work.
- Do not change backend account response/request inheritance in this story. The structural response/request cleanup is tracked later under Epic 8 / IR-DTO-001.
- Do not add or upgrade frontend dependencies.

### Testing And Verification Details

- `npm run build` executes `tsc --noEmit && vite build`, so it verifies TypeScript strict-mode compile and Vite production build. [Source: `inex/ClientApp/package.json`; `inex/ClientApp/tsconfig.json`]
- `npm run lint` executes `eslint ./src/**/*.ts ./src/**/*.tsx`. No ESLint config file was found under `inex/ClientApp`, so use the repo script as-is and do not add lint tooling as part of this bug fix. [Source: `inex/ClientApp/package.json`]
- There is no committed frontend test script. Do not invent a test runner for this story. If frontend automated coverage is desired, it belongs to Epic 7 Story 7.3.
- Backend account integration tests already show the correct valid update payload shape with `key`. If a future frontend test runner exists, add a regression test that asserts the edit flow sends `key` in the update thunk payload. [Source: `inex.Tests/Accounts/AccountsControllerTests.cs`]

### Latest Technical Context

- The project already uses typed Redux dispatch via `AppDispatch` and `useAppDispatch`. Redux Toolkit's current TypeScript guidance still recommends deriving `AppDispatch` from the configured store and using typed hooks for thunk-aware dispatch. Keep the existing pattern instead of introducing a new async pattern for this one-line contract fix. [Source: `inex/ClientApp/src/store/index.ts`; `inex/ClientApp/src/store/hooks.ts`; https://redux-toolkit.js.org/usage/usage-with-typescript/]
- Project package versions are pinned in `inex/ClientApp/package.json`: React 18, TypeScript 5.9, Vite 6, Ant Design 5, Redux Toolkit 1.7, Axios 1.14. Do not upgrade them for this story.

### Previous Story Intelligence

- Story 1.1 established that Epic 1 fixes should preserve API routes, JSON shapes, validation behavior, and existing success behavior while fixing production bugs. Apply the same compatibility discipline here.
- Story 1.2 reinforced that story scope must stay narrow and that broader architecture changes should not be pulled forward. For Story 1.3, that means no RTK Query migration, no DTO hierarchy cleanup, and no backend validator redesign.
- Both previous stories treated `docs/implementation/sprint-status.yaml` as parent-owned status tracking. Do not update sprint status from this story file creation or implementation unless explicitly instructed by the parent workflow.
- Git history analysis is currently blocked because Git marks `D:/work/inex` as a dubious ownership path for the sandbox user. Do not change global Git configuration just to satisfy story creation context.

### Project Structure Notes

- Likely frontend-only files:
  - `inex/ClientApp/src/store/accounts/accounts-actions.ts`
  - `inex/ClientApp/src/pages/Accounts/AccountEditForm.tsx`
- Read-only backend contract/validation references:
  - `inex.Services/Validators/Account/AccountCreateValidator.cs`
  - `inex.Services/Validators/Account/AccountUpdateValidator.cs`
  - `inex.Services/Models/Records/Account/CreateAccountRequest.cs`
  - `inex.Services/Models/Records/Account/UpdateAccountRequest.cs`
  - `inex.Services/Models/Records/Account/AccountResponse.cs`
  - `inex.Services/Models/Mappers/AccountMapper.cs`
- Supporting frontend context:
  - `inex/ClientApp/src/model/Account/AccountDetails.ts`
  - `inex/ClientApp/src/model/Base/ItemDetails.ts`
  - `inex/ClientApp/src/store/accounts/accounts-slice.ts`
  - `inex/ClientApp/src/pages/Accounts.tsx`
- Avoid touching:
  - `docs/implementation/sprint-status.yaml`
  - backend validators, records, services, and controllers unless implementation discovers a separate backend defect
  - `package.json` and `package-lock.json` unless the user explicitly asks for dependency work

### Project Context Reference

- Frontend uses React 18, TypeScript strict mode, Vite 6, Ant Design 5, Redux Toolkit, Axios, React Router, and i18next. Check installed versions before using newer library APIs. [Source: `docs/project-context.md`]
- Frontend API calls must use shared `apiClient`; do not create raw Axios clients or use `fetch` for authenticated app API calls. [Source: `docs/project-context.md`]
- API errors should route through helpers such as `parseAxiosError`; avoid ad hoc extraction in components. [Source: `docs/project-context.md`]
- New user-visible frontend text should go through locale files, but this story should not need new visible text. [Source: `docs/project-context.md`]
- Do not change serialized API contracts unless intentionally changing the contract and updating all consumers. This story preserves the backend account update contract by sending the missing field. [Source: `docs/project-context.md`]
- Frontend verification from `inex/ClientApp` requires `npm run build` and `npm run lint` unless a story adds a frontend test runner. [Source: `docs/project-context.md`]

### References

- `docs/planning/epics.md` - Epic 1 and Story 1.3 acceptance criteria.
- `docs/planning/architecture.md` - Story 1.3 architecture mapping and frontend thunk/form boundary.
- `docs/planning/prds/prd-inex-2026-05-20/prd.md` - BUG-003 and Sprint 1 delivery order.
- `docs/project-context.md` - stack, API-client, TypeScript, and verification rules.
- `docs/implementation/1-1-enforce-object-level-authorization-in-service-methods.md` - prior Epic 1 compatibility and story structure.
- `docs/implementation/1-2-fix-refresh-token-rotation-race-condition.md` - prior Epic 1 scope discipline and completion-note pattern.
- `inex/ClientApp/src/store/accounts/accounts-actions.ts` - current create/update thunk behavior.
- `inex/ClientApp/src/pages/Accounts/AccountEditForm.tsx` - current edit submit call site.
- `inex/ClientApp/src/pages/Accounts.tsx` - account list refresh behavior after `lastUpdate`.
- `inex.Services/Validators/Account/AccountCreateValidator.cs` and `AccountUpdateValidator.cs` - backend validation rules that require `key`.
- `inex.Services/Models/Records/Account/*` and `inex.Services/Models/Mappers/AccountMapper.cs` - account request/response and mapper contract.
- Redux Toolkit TypeScript usage docs - https://redux-toolkit.js.org/usage/usage-with-typescript/

## Dev Agent Record

### Agent Model Used

TBD by dev agent.

### Debug Log References

### Completion Notes List

- Story context generated from BMAD create-story workflow.
- Ultimate context engine analysis completed - comprehensive developer guide created.
- `docs/implementation/sprint-status.yaml` was read for context only and intentionally not updated because the parent workflow owns status updates.
- Story 1.3 was explicitly requested, so the workflow did not auto-select the first backlog item from sprint status.
- Git status/history analysis was unavailable because Git rejected `D:/work/inex` as a dubious ownership path for the sandbox user.
- External technical check was limited to official Redux Toolkit TypeScript guidance; no package upgrade is required.

### File List

