# Activation Split Button + Schedule Modal

## Goal

Replace the Template Studio Activation card’s Publish now / Schedule segmented toggle and inline date fields with a compact orange split button. Scheduling uses a modal. Parent publish/schedule confirm contract stays unchanged.

## Surface

- `app/components/Z/TemplateStudio/ActivationWindow.vue`
- Used from `app/pages/settings/templates/index.vue`
- Tests: `test/nuxt/template-studio-workflow.nuxt.spec.ts` (`ActivationWindow` describe)
- i18n: `i18n/locales/en.json`, `i18n/locales/ms.json` under `components.templateStudio`

## UI & Interaction

Remove:

- Publish now / Schedule segmented toggle
- Inline start/end date fields on the card body

Keep:

- Card title (`activation`) and description (`activationDescription`)
- Disabled reason warning when present
- Existing `confirm` emit: `{ startDate: Date | null; endDate: Date | null }`

### Split button (full-width, primary orange)

**Unscheduled state**

- Left: `Publish now` — emits `confirm` with `{ startDate: null, endDate: null }`
- Right: clock icon (`i-lucide-clock` or equivalent) — opens schedule modal
- Divider between left and right segments

**Scheduled (armed) state**

- Left: `Schedule on {start} – {end}` — validates then emits `confirm` with applied window
- Right: X icon — clears applied schedule and returns to unscheduled state (does not emit)
- Start/end labels reuse today’s immediate / indefinite fallbacks when null
- Edit path: clear with X, then open clock again

### Schedule modal

- Inline `UModal` inside `ActivationWindow` (same Nuxt UI pattern as `Z/Modal/*`; no new shared wrapper for MVP)
- Body: start + end `ZDateTimePicker` fields (same optional immediate/indefinite semantics as today), timezone hint, validation error text
- Footer: Cancel + Apply
- Opening the modal copies applied dates into draft fields
- Apply validates draft, then copies draft → applied, closes modal, arms scheduled state
- Cancel closes without changing applied schedule
- Validation rules unchanged:
  - Invalid dates rejected
  - End must be after start when both set
  - End must be in the future when set (vs `now` prop or current time)

## State Model

| State | Meaning |
|-------|---------|
| `scheduleOpen` | Modal visibility |
| `appliedStart` / `appliedEnd` | Armed schedule shown on the split button; used on confirm |
| `draftStart` / `draftEnd` | Modal editing copies; discarded on Cancel |
| `scheduled` | Derived: true after successful Apply until X clears |

Props remain: `startDate`, `endDate`, `timezone`, `disabled`, `disabledReason`, `loading`, `now`. Initial props seed applied dates when provided; if either initial date is present, start in scheduled state.

Disabled/loading apply to the left confirm action only. Clock/X remain usable unless the whole card should stay interactive for clearing/editing while disabled is false; when `disabled` is true, disable left confirm and prefer also disabling schedule open / clear to avoid arming a publish that cannot run.

## i18n

Add keys for:

- Schedule-on label with start/end placeholders (e.g. `scheduleOnRange`)
- Clock / clear aria-labels
- Modal title (e.g. schedule activation window)
- Reuse existing start/end/immediate/indefinite/timezone/validation/cancel/apply strings where possible

Update `activationDescription` only if the copy still implies a segmented toggle; prefer a small wording tweak so it matches “publish now or schedule via the clock.”

## Out of Scope

- Backend activation API changes
- Parent confirmation dialog changes on the templates page
- Reopening the modal to edit without clearing first
- Shared reusable split-button component library extraction

## Tests

Update `ActivationWindow` specs to:

1. Publish now still emits nullable boundaries
2. Clock opens modal; Apply with null/null arms schedule and confirm emits open-ended schedule
3. Validation still blocks non-increasing or past ends before emit
4. X clears schedule back to Publish now
5. Malay locale still reaches `ZDateTimePicker` labels via the modal path

Remove assertions that depend on `[data-mode="publish-now"]` / `[data-mode="schedule"]` toggle. Prefer new hooks such as `data-action="publish-now"`, `data-action="schedule"`, `data-action="open-schedule"`, `data-action="clear-schedule"`.
