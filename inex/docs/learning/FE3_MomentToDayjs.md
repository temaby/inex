# FE3 — moment.js → dayjs Migration

## Why replace moment?

`moment` is effectively unmaintained. Its authors posted a maintenance notice in 2020
recommending alternatives. It has two practical problems for modern apps:

**Size:** moment bundles every locale it knows about. The minified + gzipped cost is
~67 KB for the core plus significant extra for each locale file you import. `dayjs` is
~2 KB gzipped for the core, and each locale file is tiny. For a CRA app where every KB
goes into the initial JS bundle, this matters.

**Mutability:** moment objects are mutable by default. `date.startOf('month')` mutates
`date` in place and returns `this`. This is a constant source of bugs:

```javascript
// moment — MUTATES the original
const start = date.startOf('month');  // date is now also the start of month
const end = date.endOf('month');      // date is now also the end of month
// start === end — both point to the same mutated object
```

dayjs objects are **immutable** — every operation returns a new object:

```javascript
// dayjs — always safe
const start = date.startOf('month');  // new object
const end = date.endOf('month');      // new object, date unchanged
```

This is why the InEx migration could drop all `.clone()` calls — they were moment
defensiveness, not logic.

---

## The antd v4 complication

antd v4 ships with moment as its internal date library. Its `DatePicker`, `RangePicker`,
and `TimePicker` all expect `Moment` objects as values and emit `Moment` objects in
`onChange` callbacks.

Simply swapping `import moment from "moment"` for `import dayjs from "dayjs"` in
component files would leave antd internally still expecting Moment — a type mismatch.

The official antd v4 solution is **`generatePicker`** — a factory function that produces
a DatePicker wired to any date library that implements a common interface.
antd ships generate configs for moment, dayjs, and date-fns out of the box.

---

## What was changed

### New files

**`src/dayjsSetup.ts`** — registers the dayjs plugins required by both antd v4's
DatePicker internals and by the app's own date operations:

| Plugin | Why needed |
|---|---|
| `customParseFormat` | `dayjs("2024-01", "YYYY-MM")` — parsing with explicit format |
| `weekday` | antd DatePicker week grid |
| `localeData` | `.format("MMMM")` — locale-aware month names |
| `weekOfYear` | antd DatePicker week numbers |
| `weekYear` | antd DatePicker year-of-week |
| `advancedFormat` | additional format tokens (`Qo`, `WW`, etc.) |

This file is imported first in `src/index.tsx` — before App, i18n, or any component.
Plugins must be registered before any code calls `dayjs()`.

**`src/components/DatePicker.tsx`** — a dayjs-typed DatePicker built with generatePicker:

```typescript
import dayjsGenerateConfig from "rc-picker/lib/generate/dayjs";
import generatePicker from "antd/es/date-picker/generatePicker";
import type { Dayjs } from "dayjs";

const DatePicker = generatePicker<Dayjs>(dayjsGenerateConfig);
export default DatePicker;
```

`rc-picker` is antd's underlying date picker library — it ships generate configs for
each supported date library in `rc-picker/lib/generate/`. The resulting `DatePicker`
component has the same props and API as antd's own, but with `Dayjs` instead of `Moment`
as the value type. `DatePicker.RangePicker` is available as a static property.

Usage across the app:
```typescript
// Before
import { DatePicker } from "antd";
const { RangePicker } = DatePicker;

// After
import DatePicker from "../../components/DatePicker";
const { RangePicker } = DatePicker;
```

### Modified files

**`src/i18n.ts`** — locale sync moved from moment to dayjs:

```typescript
// Before
import moment from "moment";
import "moment/locale/ru";
function syncMomentLocale(lang: string) {
    moment.locale(lang === "ru" ? "ru" : "en");
}

// After
import dayjs from "dayjs";
function syncDayjsLocale(lang: string) {
    dayjs.locale(lang === "ru" ? "ru" : "en");
}
```

`dayjs.locale(name)` sets the global locale. The Russian locale file is registered in
`dayjsSetup.ts` via `import "dayjs/locale/ru"`.

**14 source files** — all `moment` import/usage replaced with `dayjs`:

| moment API | dayjs equivalent | Notes |
|---|---|---|
| `import moment from "moment"` | `import dayjs from "dayjs"` | |
| `import { Moment } from "moment"` | `import type { Dayjs } from "dayjs"` | |
| `import "moment/locale/ru"` | in `dayjsSetup.ts` | registered once globally |
| `moment()` | `dayjs()` | |
| `moment(str, format)` | `dayjs(str, format)` | needs `customParseFormat` plugin |
| `moment.unix(ts)` | `dayjs.unix(ts)` | |
| `.format("YYYY-MM-DD")` | `.format("YYYY-MM-DD")` | identical |
| `.unix()` | `.unix()` | identical |
| `.year()` | `.year()` | identical |
| `.month()` / `.month(n)` | `.month()` / `.month(n)` | 0-indexed, identical |
| `.subtract(n, unit)` | `.subtract(n, unit)` | returns new object (immutable) |
| `.startOf(unit)` | `.startOf(unit)` | returns new object |
| `.endOf(unit)` | `.endOf(unit)` | returns new object |
| `.isValid()` | `.isValid()` | identical |
| `.clone()` | removed | dayjs is immutable — clone is never needed |
| `moment.locale(lang)` | `dayjs.locale(lang)` | |

---

## Immutability in practice

The two `.clone()` calls that were removed:

```typescript
// Before (moment — defensive cloning because moment mutates)
const prevMonth = selectedMonth.clone().subtract(1, 'month');
const start = localDate.clone().startOf('month').format('YYYY-MM-DD');

// After (dayjs — no clone needed, subtract/startOf return new objects)
const prevMonth = selectedMonth.subtract(1, 'month');
const start = localDate.startOf('month').format('YYYY-MM-DD');
```

With dayjs, `localDate` is unchanged after calling `.startOf('month')` — the result is
a new Dayjs object. This is never a trap.

---

## Plugin loading order matters

Plugins must be registered before any code uses the features they provide. In a CRA app
the module graph determines load order. By importing `"./dayjsSetup"` as the first
import in `index.tsx`, all plugins are registered before React renders, before i18n
initializes, and before any DatePicker is created.

If a plugin is missing, the symptom is usually a runtime error or silent wrong behaviour
(e.g. `.format("MMMM")` returning the numeric month instead of the name). The plugin list
in `dayjsSetup.ts` is the complete set required by antd v4's DatePicker plus the app's own usage.

---

## Why not `antd-dayjs-webpack-plugin`?

`antd-dayjs-webpack-plugin` is a webpack alias plugin that replaces moment with dayjs
at the bundler level — you don't have to change import statements. It only works if you
can modify the webpack config, which CRA doesn't expose without ejecting.

The `generatePicker` approach requires explicit import changes but:
- Works with CRA (no webpack config needed)
- Produces correctly typed code — `value` accepts `Dayjs`, not `any`
- Is the official antd v4 recommendation
- The custom `DatePicker.tsx` is a single file that centralizes the wiring

---

## Bundle impact

| | Before | After |
|---|---|---|
| moment core | ~67 KB gzip | 0 |
| moment/locale/ru | ~3 KB gzip | 0 |
| dayjs core | 0 | ~2 KB gzip |
| dayjs plugins (6) | 0 | ~2 KB gzip |
| dayjs/locale/ru | 0 | ~0.5 KB gzip |
| **Net change** | | **−≈66 KB** |

This is the main motivation for FE4 (antd v5) as well — antd v5 uses dayjs natively and
removes the need for the `generatePicker` wrapper entirely.

---

## What this migration unblocks

```
FE3 (moment → dayjs) ← done
    └── FE4 (antd v4 → v5)   — antd v5 uses dayjs natively, no generatePicker needed
        └── FE5 (CRA → Vite)  — faster dev server, ESM-first
            └── FE6 (RTK Query) — replaces manual thunks
                └── FE7 (Vitest + RTL) — modern test stack
```

antd v5 dropped moment entirely and made dayjs the default. Without this migration,
upgrading to antd v5 would require doing both at the same time — a much larger diff.
Doing FE3 first isolates the date library change into its own reviewable commit.
