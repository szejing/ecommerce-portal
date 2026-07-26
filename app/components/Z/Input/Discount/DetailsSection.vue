<template>
	<UCard id="section-discount-details" class="shadow-md scroll-mt-4">
		<template #header>
			<div class="flex items-start justify-between">
				<div class="flex-1">
					<div class="flex items-center gap-2">
						<UIcon :name="ICONS.TAG" class="text-primary-500 w-6 h-6" />
						<h2 class="text-xl font-semibold">{{ t('pages.discountDetails') }}</h2>
						<span class="text-red-500 text-sm">*</span>
					</div>
					<p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{{ t('components.discountForm.sectionSubtitle') }}</p>
				</div>
			</div>
		</template>

		<div class="space-y-6 py-2 px-4">
			<div class="w-full flex flex-wrap items-center gap-4 justify-end">
				<UFormField name="is_disabled">
					<USwitch v-model="discountActive" :label="discountStatusLabel" />
				</UFormField>
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<UFormField :label="t('form.code')" name="code">
					<p class="text-xs text-neutral-500 dark:text-neutral-400 my-1">{{ t('components.discountForm.codeHint') }}</p>
					<UInput v-model="state.code" :disabled="codeDisabled" :placeholder="t('components.discountForm.codePlaceholder')" />
				</UFormField>
				<UFormField :label="t('form.description')" name="description" required>
					<p class="text-xs text-neutral-500 dark:text-neutral-400 my-1">{{ t('components.discountForm.descriptionHint') }}</p>
					<UInput v-model="state.description" />
				</UFormField>

				<div class="grid grid-cols-1 sm:grid-cols-6 gap-4">
					<UFormField class="col-span-1 sm:col-span-3" :label="t('components.discountForm.validityStartsAt')" name="starts_at">
						<UPopover v-model:open="startsAtPopoverOpen" :content="{ align: 'start' }" :modal="true">
							<UButton icon="i-lucide-calendar" color="neutral" variant="outline" class="w-full min-w-0 justify-between group">
								<span class="truncate">{{ startsAtButtonLabel }}</span>
								<UIcon name="i-lucide-chevron-down" class="shrink-0 size-5 text-dimmed group-data-[state=open]:rotate-180 transition-transform" />
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

					<UFormField class="col-span-1 sm:col-span-3" :label="t('components.discountForm.validityEndsAt')" name="ends_at">
						<UPopover v-model:open="endsAtPopoverOpen" :content="{ align: 'start' }" :modal="true">
							<UButton icon="i-lucide-calendar" color="neutral" variant="outline" class="w-full min-w-0 justify-between group">
								<span class="truncate">{{ endsAtButtonLabel }}</span>
								<UIcon name="i-lucide-chevron-down" class="shrink-0 size-5 text-dimmed group-data-[state=open]:rotate-180 transition-transform" />
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
	</UCard>
</template>

<script lang="ts" setup>
import { endOfDay, startOfDay } from 'date-fns';
import { getFormattedDate } from 'yeppi-common';
import type { DiscountCreate } from '~/utils/types/form/discount-creation';
import { ICONS } from '~/utils/icons';

const props = withDefaults(
	defineProps<{
		state: DiscountCreate;
		codeDisabled?: boolean;
	}>(),
	{ codeDisabled: false },
);

const { t } = useI18n();
const state = toRef(props, 'state');

const discountActive = computed({
	get: () => !state.value.is_disabled,
	set: (value: boolean) => {
		state.value.is_disabled = !value;
	},
});

const discountStatusLabel = computed(() => (discountActive.value ? t('components.discountForm.statusActive') : t('components.discountForm.statusDisabled')));

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
