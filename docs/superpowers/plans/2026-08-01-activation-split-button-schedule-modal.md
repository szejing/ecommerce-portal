# Activation Split Button + Schedule Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ActivationWindow’s Publish/Schedule toggle with an orange split button and a schedule modal, keeping the existing `confirm` emit contract.

**Architecture:** Local UI-only change in `ActivationWindow.vue`. Unscheduled state is `[Publish now | clock]`; clock opens `UModal` with draft start/end pickers; Apply arms schedule and updates the button to `[Schedule on start – end | X]`. Left click confirms; X clears. Parent page and backend stay unchanged.

**Tech Stack:** Vue 3, Nuxt 4, Nuxt UI v4 (`UModal`, `UButton`, `UIcon`), `ZDateTimePicker`, i18n (`en`/`ms`), Vitest + `@nuxt/test-utils`.

**Spec:** `docs/superpowers/specs/2026-08-01-activation-split-button-schedule-modal-design.md`

**Skills:** @implementation-and-tests, @nuxt-ui-usage, @i18n-translation

## Global Constraints

- Do not change backend activation APIs or parent confirm dialogs on `settings/templates/index.vue`.
- Preserve emit shape: `{ startDate: Date | null; endDate: Date | null }`.
- Reuse existing validation messages and date semantics (null start = immediate, null end = indefinite).
- When `disabled` is true, disable confirm, open-schedule, and clear-schedule.
- Do not run Nuxt with `bun --bun`; use `bun run test:vitest:run -- <path>`.
- Prefer commits only when the user asks, or follow plan commit steps if executing with explicit commit permission.

## File map

- Modify: `app/components/Z/TemplateStudio/ActivationWindow.vue`
- Modify: `test/nuxt/template-studio-workflow.nuxt.spec.ts` (`ActivationWindow` describe only)
- Modify: `i18n/locales/en.json` (`components.templateStudio`)
- Modify: `i18n/locales/ms.json` (`components.templateStudio`)

---

### Task 1: Update ActivationWindow tests for split button + modal

**Files:**
- Modify: `test/nuxt/template-studio-workflow.nuxt.spec.ts`

**Hooks to use:**
- `data-action="publish-now"` — left confirm when unscheduled
- `data-action="schedule"` — left confirm when scheduled
- `data-action="open-schedule"` — clock
- `data-action="clear-schedule"` — X
- `data-action="apply-schedule"` — modal Apply
- `data-action="cancel-schedule"` — modal Cancel
- Keep `data-date="start"` / `data-date="end"` on modal date triggers

- [ ] **Step 1: Rewrite the four ActivationWindow tests**

Replace mode-toggle flows with:

```ts
describe('ActivationWindow', () => {
	it('emits nullable boundaries for Publish now and open-ended schedules', async () => {
		const publishNow = await mountSuspended(ActivationWindow, {
			props: { timezone: 'Asia/Kuala_Lumpur' },
		});
		await publishNow.get('[data-action="publish-now"]').trigger('click');
		expect(publishNow.emitted('confirm')).toEqual([[{ startDate: null, endDate: null }]]);

		const schedule = await mountSuspended(ActivationWindow, {
			props: { timezone: 'Asia/Kuala_Lumpur' },
		});
		await schedule.get('[data-action="open-schedule"]').trigger('click');
		await flushPromises();
		await schedule.get('[data-action="apply-schedule"]').trigger('click');
		await schedule.get('[data-action="schedule"]').trigger('click');
		expect(schedule.emitted('confirm')).toEqual([[{ startDate: null, endDate: null }]]);
	});

	it('rejects non-increasing or expired schedule ends before emitting', async () => {
		const wrapper = await mountSuspended(ActivationWindow, {
			props: {
				timezone: 'Asia/Kuala_Lumpur',
				startDate: new Date('2026-08-07T08:00:00+08:00'),
				endDate: new Date('2026-08-06T08:00:00+08:00'),
				now: new Date('2026-08-01T00:00:00.000Z'),
			},
		});

		// props with dates arm scheduled state
		await wrapper.get('[data-action="schedule"]').trigger('click');

		expect(wrapper.emitted('confirm')).toBeUndefined();
		expect(wrapper.get('[role="alert"]').text()).toContain('after the start');
	});

	it('checks the schedule end against the current click time', async () => {
		vi.useFakeTimers();
		try {
			vi.setSystemTime(new Date('2026-08-01T00:00:00.000Z'));
			const wrapper = await mountSuspended(ActivationWindow, {
				props: { timezone: 'Asia/Kuala_Lumpur', endDate: new Date('2026-08-02T00:00:00.000Z') },
			});
			vi.setSystemTime(new Date('2026-08-03T00:00:00.000Z'));

			await wrapper.get('[data-action="schedule"]').trigger('click');

			expect(wrapper.emitted('confirm')).toBeUndefined();
			expect(wrapper.get('[role="alert"]').text()).toContain('future');
		} finally {
			vi.useRealTimers();
		}
	});

	it('clears an armed schedule back to Publish now', async () => {
		const wrapper = await mountSuspended(ActivationWindow, {
			props: {
				timezone: 'Asia/Kuala_Lumpur',
				startDate: new Date('2026-08-07T08:00:00+08:00'),
			},
		});
		expect(wrapper.find('[data-action="schedule"]').exists()).toBe(true);
		await wrapper.get('[data-action="clear-schedule"]').trigger('click');
		expect(wrapper.find('[data-action="publish-now"]').exists()).toBe(true);
		await wrapper.get('[data-action="publish-now"]').trigger('click');
		expect(wrapper.emitted('confirm')).toEqual([[{ startDate: null, endDate: null }]]);
	});

	it('passes localized Malay controls and an accessible time label to the date-time picker', async () => {
		try {
			await useNuxtApp().$i18n.setLocale('ms');
			const wrapper = await mountSuspended(ActivationWindow, {
				props: { timezone: 'Asia/Kuala_Lumpur' },
			});

			await wrapper.get('[data-action="open-schedule"]').trigger('click');
			await flushPromises();
			await wrapper.get('[data-date="start"]').trigger('click');
			await flushPromises();
			const picker = wrapper.getComponent(DateTimePicker);

			expect(picker.props()).toMatchObject({
				selectTimeLabel: 'Pilih masa',
				cancelLabel: 'Batal',
				applyLabel: 'Guna',
				timeInputLabel: 'Masa pengaktifan',
			});
			expect(picker.get('input[type="time"]').attributes('aria-label')).toBe('Masa pengaktifan');
			expect(picker.text()).toContain('Batal');
			expect(picker.text()).toContain('Guna');
			expect(picker.text()).not.toContain('Cancel');
		} finally {
			await useNuxtApp().$i18n.setLocale('en');
		}
	});
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd /Users/szejinggo/Documents/Projects/ecommerce/wemotoo-portal
bun run test:vitest:run -- test/nuxt/template-studio-workflow.nuxt.spec.ts
```

Expected: ActivationWindow cases fail (missing `open-schedule` / `apply-schedule` / `clear-schedule`).

---

### Task 2: Add i18n keys

**Files:**
- Modify: `i18n/locales/en.json`
- Modify: `i18n/locales/ms.json`

- [ ] **Step 1: Add English keys under `components.templateStudio`**

```json
"activationDescription": "Publish the saved draft now, or use the clock to choose an optional activation window.",
"scheduleOnRange": "Schedule on {start} – {end}",
"openSchedule": "Choose activation window",
"clearSchedule": "Cancel scheduled publish",
"scheduleModalTitle": "Activation window",
"applySchedule": "Apply",
"cancelSchedule": "Cancel"
```

Keep existing `publishNow`, start/end hints, validation, timezone, picker labels.

- [ ] **Step 2: Add Malay equivalents**

```json
"activationDescription": "Terbitkan draf yang disimpan sekarang, atau guna ikon jam untuk memilih tempoh pengaktifan pilihan.",
"scheduleOnRange": "Jadualkan pada {start} – {end}",
"openSchedule": "Pilih tempoh pengaktifan",
"clearSchedule": "Batalkan penerbitan berjadual",
"scheduleModalTitle": "Tempoh pengaktifan",
"applySchedule": "Guna",
"cancelSchedule": "Batal"
```

---

### Task 3: Implement ActivationWindow split button + modal

**Files:**
- Modify: `app/components/Z/TemplateStudio/ActivationWindow.vue`

- [ ] **Step 1: Replace template with split button + modal**

Structure:

```vue
<template>
	<UCard :ui="{ body: 'p-4 sm:p-4' }">
		<div class="space-y-4">
			<div>
				<h2 class="font-semibold text-default">{{ t('components.templateStudio.activation') }}</h2>
				<p class="text-sm text-muted">{{ t('components.templateStudio.activationDescription') }}</p>
			</div>

			<p v-if="disabledReason" class="text-sm text-warning">{{ disabledReason }}</p>
			<p v-if="validationError" role="alert" class="text-sm text-error">{{ validationError }}</p>

			<div class="flex min-h-11 w-full overflow-hidden rounded-lg">
				<UButton
					:data-action="scheduled ? 'schedule' : 'publish-now'"
					type="button"
					class="min-h-11 min-w-0 flex-1 justify-center rounded-none"
					:disabled="disabled"
					:loading="loading"
					:icon="scheduled ? 'i-lucide-calendar-check' : 'i-lucide-send'"
					@click="confirmActivation"
				>
					{{ primaryLabel }}
				</UButton>
				<div class="w-px bg-white/30" aria-hidden="true" />
				<UButton
					v-if="!scheduled"
					data-action="open-schedule"
					type="button"
					class="min-h-11 w-12 shrink-0 justify-center rounded-none px-0"
					icon="i-lucide-clock"
					:disabled="disabled"
					:aria-label="t('components.templateStudio.openSchedule')"
					@click="openScheduleModal"
				/>
				<UButton
					v-else
					data-action="clear-schedule"
					type="button"
					class="min-h-11 w-12 shrink-0 justify-center rounded-none px-0"
					icon="i-lucide-x"
					:disabled="disabled"
					:aria-label="t('components.templateStudio.clearSchedule')"
					@click="clearSchedule"
				/>
			</div>
		</div>

		<UModal v-model:open="scheduleOpen" :title="t('components.templateStudio.scheduleModalTitle')">
			<template #body>
				<!-- start/end ZDateTimePicker on draftStart/draftEnd; timezone hint; draftValidationError -->
			</template>
			<template #footer>
				<div class="flex w-full justify-end gap-2">
					<UButton data-action="cancel-schedule" color="neutral" variant="outline" @click="cancelScheduleModal">
						{{ t('components.templateStudio.cancelSchedule') }}
					</UButton>
					<UButton data-action="apply-schedule" @click="applySchedule">
						{{ t('components.templateStudio.applySchedule') }}
					</UButton>
				</div>
			</template>
		</UModal>
	</UCard>
</template>
```

Reuse the existing start/end picker markup from the current component, bound to `draftStart` / `draftEnd` inside the modal body.

- [ ] **Step 2: Replace script state/logic**

```ts
const scheduleOpen = ref(false);
const appliedStart = ref<Date | null>(props.startDate ? new Date(props.startDate) : null);
const appliedEnd = ref<Date | null>(props.endDate ? new Date(props.endDate) : null);
const draftStart = ref<Date | null>(null);
const draftEnd = ref<Date | null>(null);
const scheduled = ref(Boolean(props.startDate || props.endDate));
const validationError = ref('');
const draftValidationError = ref('');

watch(() => props.startDate, value => {
	appliedStart.value = value ? new Date(value) : null;
	scheduled.value = Boolean(value || props.endDate);
});
watch(() => props.endDate, value => {
	appliedEnd.value = value ? new Date(value) : null;
	scheduled.value = Boolean(props.startDate || value);
});

const primaryLabel = computed(() => {
	if (!scheduled.value) return t('components.templateStudio.publishNow');
	return t('components.templateStudio.scheduleOnRange', {
		start: dateLabel(appliedStart.value, 'components.templateStudio.immediate'),
		end: dateLabel(appliedEnd.value, 'components.templateStudio.indefinite'),
	});
});

function openScheduleModal(): void {
	if (props.disabled) return;
	draftStart.value = appliedStart.value ? new Date(appliedStart.value) : null;
	draftEnd.value = appliedEnd.value ? new Date(appliedEnd.value) : null;
	draftValidationError.value = '';
	scheduleOpen.value = true;
}

function cancelScheduleModal(): void {
	scheduleOpen.value = false;
	draftValidationError.value = '';
}

function clearSchedule(): void {
	if (props.disabled) return;
	scheduled.value = false;
	appliedStart.value = null;
	appliedEnd.value = null;
	validationError.value = '';
}

function validateWindow(start: Date | null, end: Date | null): string {
	if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) {
		return t('components.templateStudio.scheduleInvalidDate');
	}
	if (start && end && end.getTime() <= start.getTime()) {
		return t('components.templateStudio.scheduleEndAfterStart');
	}
	if (end && end.getTime() <= (props.now ?? new Date()).getTime()) {
		return t('components.templateStudio.scheduleEndFuture');
	}
	return '';
}

function applySchedule(): void {
	const error = validateWindow(draftStart.value, draftEnd.value);
	if (error) {
		draftValidationError.value = error;
		return;
	}
	appliedStart.value = draftStart.value ? new Date(draftStart.value) : null;
	appliedEnd.value = draftEnd.value ? new Date(draftEnd.value) : null;
	scheduled.value = true;
	validationError.value = '';
	scheduleOpen.value = false;
}

function confirmActivation(): void {
	if (props.disabled) return;
	validationError.value = '';
	if (!scheduled.value) {
		emit('confirm', { startDate: null, endDate: null });
		return;
	}
	const error = validateWindow(appliedStart.value, appliedEnd.value);
	if (error) {
		validationError.value = error;
		return;
	}
	emit('confirm', {
		startDate: appliedStart.value ? new Date(appliedStart.value) : null,
		endDate: appliedEnd.value ? new Date(appliedEnd.value) : null,
	});
}
```

Keep `dateLabel` as today.

- [ ] **Step 3: Run ActivationWindow tests — expect PASS**

```bash
cd /Users/szejinggo/Documents/Projects/ecommerce/wemotoo-portal
bun run test:vitest:run -- test/nuxt/template-studio-workflow.nuxt.spec.ts
```

Expected: all ActivationWindow cases PASS (other describes in the file should still pass).

---

### Task 4: Verification

- [ ] **Step 1: Re-run focused Nuxt test file**

```bash
bun run test:vitest:run -- test/nuxt/template-studio-workflow.nuxt.spec.ts
```

- [ ] **Step 2: Manual smoke (if app running)**

1. Open Template Studio Activation card
2. Click Publish now → existing confirm dialog for immediate publish
3. Click clock → modal with start/end → Apply → button shows Schedule on …
4. Click Schedule on … → schedule confirm dialog
5. Click X → back to Publish now

- [ ] **Step 3: Commit (only if user requested commits)**

```bash
git add app/components/Z/TemplateStudio/ActivationWindow.vue \
  test/nuxt/template-studio-workflow.nuxt.spec.ts \
  i18n/locales/en.json i18n/locales/ms.json
git commit -m "feat: Activation split button with schedule modal"
```
