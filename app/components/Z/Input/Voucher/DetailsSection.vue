<template>
	<UCard id="section-voucher-details" class="shadow-md scroll-mt-4">
		<template #header>
			<div class="flex items-start justify-between">
				<div class="flex-1">
					<div class="flex items-center gap-2">
						<UIcon :name="ICONS.ADDITIONAL" class="text-primary-500 w-6 h-6" />
						<h2 class="text-xl font-semibold">{{ t('pages.voucherDetails') }}</h2>
						<span class="text-red-500 text-sm">*</span>
					</div>
					<p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{{ t('components.voucherForm.sectionSubtitle') }}</p>
				</div>
			</div>
		</template>

		<div class="space-y-6 py-2 px-4">
			<div v-if="showStatusSwitch" class="w-full flex flex-wrap items-center gap-4 justify-end">
				<UFormField :name="fieldName('is_disabled')">
					<USwitch v-model="voucherActive" :label="voucherStatusLabel" />
				</UFormField>
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<UFormField :label="t('form.code')" :name="fieldName('code')" :required="!codeDisabled">
					<p class="text-xs text-neutral-500 dark:text-neutral-400 my-1">{{ t('components.voucherForm.codeHint') }}</p>
					<UInput
						class="uppercase"
						:model-value="state.code"
						:disabled="codeDisabled"
						autocapitalize="characters"
						autocomplete="off"
						@update:model-value="onVoucherCodeUpdate"
					/>
				</UFormField>

				<UFormField :label="t('form.description')" :name="fieldName('description')">
					<p class="text-xs text-neutral-500 dark:text-neutral-400 my-1">{{ t('components.voucherForm.descriptionHint') }}</p>
					<UInput v-model="state.description" />
				</UFormField>
			</div>

			<div class="grid grid-cols-12">
				<div id="section-voucher-validity" class="col-span-12 scroll-mt-4 space-y-3 border-t border-default pt-4 lg:col-span-6">
					<div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
						<div class="flex min-w-0 items-center gap-2">
							<UIcon :name="ICONS.CALENDAR" class="text-primary-500 w-5 h-5 shrink-0" />
							<h3 class="text-base font-semibold text-highlighted">{{ t('components.voucherForm.validityPeriod') }}</h3>
						</div>
						<p class="text-xs text-neutral-500 dark:text-neutral-400 sm:max-w-[min(100%,20rem)] sm:text-right">
							{{ t('components.discountForm.validityPeriodUnsetHint') }}
						</p>
					</div>
					<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
						<UFormField
							class="min-w-0 w-full sm:flex-1"
							:name="fieldName('starts_at')"
							:label="t('components.discountForm.validityStartsAt')"
							:ui="{ label: 'sr-only' }"
						>
							<UPopover v-model:open="startsAtPopoverOpen" :content="{ align: 'start' }" :modal="true">
								<UButton icon="i-lucide-calendar" color="neutral" variant="outline" size="sm" class="w-full min-w-0 justify-between group">
									<span class="truncate">{{ startsAtButtonLabel }}</span>
									<UIcon name="i-lucide-chevron-down" class="shrink-0 size-4 text-dimmed group-data-[state=open]:rotate-180 transition-transform" />
								</UButton>
								<template #content>
									<div class="p-2 space-y-2">
										<ZDatePicker v-model="startsAtAsDate" :max-date="startsAtMaxDate" @close="startsAtPopoverOpen = false" />
										<div v-if="state.starts_at" class="flex justify-end border-t border-default pt-2">
											<UButton :label="t('components.filter.clear')" color="neutral" variant="soft" size="sm" @click="clearStartsAt" />
										</div>
									</div>
								</template>
							</UPopover>
						</UFormField>

						<span class="text-center text-sm text-muted tabular-nums sm:hidden" aria-hidden="true">-</span>
						<span class="hidden sm:inline text-sm text-muted tabular-nums shrink-0 select-none" aria-hidden="true">-</span>

						<UFormField
							class="min-w-0 w-full sm:flex-1"
							:name="fieldName('ends_at')"
							:label="t('components.discountForm.validityEndsAt')"
							:ui="{ label: 'sr-only' }"
						>
							<UPopover v-model:open="endsAtPopoverOpen" :content="{ align: 'start' }" :modal="true">
								<UButton icon="i-lucide-calendar" color="neutral" variant="outline" size="sm" class="w-full min-w-0 justify-between group">
									<span class="truncate">{{ endsAtButtonLabel }}</span>
									<UIcon name="i-lucide-chevron-down" class="shrink-0 size-4 text-dimmed group-data-[state=open]:rotate-180 transition-transform" />
								</UButton>
								<template #content>
									<div class="p-2 space-y-2">
										<ZDatePicker v-model="endsAtAsDate" :min-date="endsAtMinDate" @close="endsAtPopoverOpen = false" />
										<div v-if="state.ends_at" class="flex justify-end border-t border-default pt-2">
											<UButton :label="t('components.filter.clear')" color="neutral" variant="soft" size="sm" @click="clearEndsAt" />
										</div>
									</div>
								</template>
							</UPopover>
						</UFormField>
					</div>
				</div>
			</div>
		</div>
	</UCard>
</template>

<script lang="ts" setup>
import { endOfDay, startOfDay } from 'date-fns';
import { getFormattedDate } from 'yeppi-common';
import type { VoucherFormState } from '~/utils/types/form/voucher-creation';
import type { Discount } from '~/utils/types/discount';
import { ICONS } from '~/utils/icons';

const selectNoneValue = '__none__' as const;

const props = withDefaults(
	defineProps<{
		state: VoucherFormState;
		codeDisabled?: boolean;
		showStatusSwitch?: boolean;
		discounts: Discount[];
		noneLabel: string;
		discountOptionsLoading?: boolean;
		/** When true, discount is created with the same code as the voucher (no picker). */
		linkDiscountToVoucherCode?: boolean;
		/** Dot-prefix for UFormField names (e.g. `voucher` → `voucher.code`). */
		formFieldPrefix?: string;
	}>(),
	{
		codeDisabled: false,
		showStatusSwitch: false,
		discountOptionsLoading: false,
		linkDiscountToVoucherCode: false,
		formFieldPrefix: '',
	},
);

const { t } = useI18n();
const state = toRef(props, 'state');

const fieldName = (segment: string) => (props.formFieldPrefix ? `${props.formFieldPrefix}.${segment}` : segment);

const onVoucherCodeUpdate = (value: string | number | undefined) => {
	state.value.code = (value == null ? '' : String(value)).toUpperCase();
};

const discountCodeSelect = computed({
	get: () => (state.value.discount_code || selectNoneValue) as string,
	set: (v: string) => {
		state.value.discount_code = v === selectNoneValue ? '' : v;
	},
});

const voucherActive = computed({
	get: () => !(state.value.is_disabled ?? false),
	set: (value: boolean) => {
		state.value.is_disabled = !value;
	},
});

const voucherStatusLabel = computed(() => (voucherActive.value ? t('components.voucherForm.statusActive') : t('components.voucherForm.statusInactive')));

const startsAtPopoverOpen = ref(false);
const endsAtPopoverOpen = ref(false);

const startsAtAsDate = computed({
	get(): Date | null {
		const s = state.value.starts_at;
		return s ? new Date(s) : null;
	},
	set(d: Date | null) {
		state.value.starts_at = d ? startOfDay(d).toISOString() : undefined;
	},
});

const endsAtAsDate = computed({
	get(): Date | null {
		const e = state.value.ends_at;
		return e ? new Date(e) : null;
	},
	set(d: Date | null) {
		state.value.ends_at = d ? endOfDay(d).toISOString() : undefined;
	},
});

watch(
	() => [state.value.starts_at, state.value.ends_at] as const,
	([start, end]) => {
		if (end && !start) {
			state.value.starts_at = startOfDay(new Date()).toISOString();
		}
	},
	{ flush: 'sync' },
);

const startsAtMaxDate = computed((): Date | undefined => {
	const e = state.value.ends_at;
	return e ? new Date(e) : undefined;
});

const endsAtMinDate = computed((): Date | undefined => {
	const s = state.value.starts_at;
	return s ? new Date(s) : undefined;
});

const startsAtButtonLabel = computed(() => {
	const s = state.value.starts_at;
	return s ? getFormattedDate(new Date(s), 'dd-MM-yyyy') : t('common.notSet');
});

const endsAtButtonLabel = computed(() => {
	const e = state.value.ends_at;
	return e ? getFormattedDate(new Date(e), 'dd-MM-yyyy') : t('common.notSet');
});

const clearStartsAt = () => {
	if (state.value.ends_at) {
		state.value.ends_at = undefined;
	}
	state.value.starts_at = undefined;
	startsAtPopoverOpen.value = false;
};

const clearEndsAt = () => {
	state.value.ends_at = undefined;
	endsAtPopoverOpen.value = false;
};
</script>
