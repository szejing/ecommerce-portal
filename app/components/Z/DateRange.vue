<template>
	<div class="flex flex-wrap items-center gap-2">
		<!-- Mobile: single USelect for presets + custom (hidden when hidePresets) -->
		<template v-if="isMobile && !hidePresets">
			<USelect
				:model-value="selectedPresetKey"
				:items="presetSelectItems"
				value-attribute="value"
				color="neutral"
				variant="outline"
				class="min-w-40"
				:ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform' }"
				@update:model-value="onPresetSelect"
			/>
			<UPopover v-model:open="popoverOpen" :content="{ align: 'end' }" :modal="true">
				<UButton icon="i-lucide-calendar" color="neutral" variant="outline" size="md" class="shrink-0" />
				<template #content>
					<div class="p-2">
						<ZDateRangePicker :model-value="draftForPicker" @update:model-value="onDraftUpdate" @close="applyCalendar" />
						<div class="flex justify-end gap-2 pt-2 border-t border-default mt-2">
							<UButton :label="t('common.cancel')" color="neutral" variant="ghost" @click="popoverOpen = false" />
							<UButton :label="t('common.apply')" color="primary" @click="applyCalendar" />
						</div>
					</div>
				</template>
			</UPopover>
		</template>
		<!-- Desktop: optional preset buttons + date range popover; mobile w/ hidePresets: popover only (same as desktop row) -->
		<template v-else>
			<template v-for="preset in presets" :key="preset.key">
				<UButton
					v-if="!hidePresets && !isMobile"
					:label="t(`components.dateRange.${preset.key}`)"
					color="primary"
					:variant="isPresetActive(preset) ? 'solid' : 'soft'"
					size="xs"
					@click="applyPreset(preset)"
				/>
			</template>
			<UPopover v-model:open="popoverOpen" :content="{ align: 'end' }" :modal="true">
				<UButton icon="i-lucide-calendar" color="neutral" variant="outline" class="min-w-56 justify-between group">
					<span class="truncate">
						{{ rangeLabel }}
					</span>
					<UIcon name="i-lucide-chevron-down" class="shrink-0 size-5 text-dimmed group-data-[state=open]:rotate-180 transition-transform" />
				</UButton>
				<template #content>
					<div class="p-2">
						<ZDateRangePicker :model-value="draftForPicker" @update:model-value="onDraftUpdate" @close="applyCalendar" />
						<div class="flex justify-end gap-2 pt-2 border-t border-default mt-2">
							<UButton :label="t('common.cancel')" color="neutral" variant="ghost" @click="popoverOpen = false" />
							<UButton :label="t('common.apply')" color="primary" @click="applyCalendar" />
						</div>
					</div>
				</template>
			</UPopover>
		</template>
	</div>
</template>

<script setup lang="ts">
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subWeeks } from 'date-fns';
import { getFormattedDate } from 'yeppi-common';
import type { Range } from '~/utils/interface';
import type { DateRange as PickerDateRange } from '~/components/Z/DateRangePicker.vue';

const model = defineModel<Range>({ required: true });

withDefaults(
	defineProps<{
		/** When true, preset shortcuts are hidden (desktop chips + mobile preset select). Custom range popover remains. */
		hidePresets?: boolean;
	}>(),
	{
		hidePresets: false,
	},
);

const { t } = useI18n();

const presets = [
	{ key: 'today', getRange: () => ({ start: startOfDay(new Date()), end: endOfDay(new Date()) }) },
	{
		key: 'yesterday',
		getRange: () => {
			const d = new Date();
			d.setDate(d.getDate() - 1);
			return { start: startOfDay(d), end: endOfDay(d) };
		},
	},
	{
		key: 'tomorrow',
		getRange: () => {
			const d = new Date();
			d.setDate(d.getDate() + 1);
			return { start: startOfDay(d), end: endOfDay(d) };
		},
	},
	{
		key: 'thisWeek',
		getRange: () => ({
			start: startOfWeek(new Date(), { weekStartsOn: 1 }),
			end: endOfWeek(new Date(), { weekStartsOn: 1 }),
		}),
	},
	{
		key: 'lastWeek',
		getRange: () => {
			const now = new Date();
			const lastWeek = subWeeks(now, 1);
			return {
				start: startOfWeek(lastWeek, { weekStartsOn: 1 }),
				end: endOfWeek(lastWeek, { weekStartsOn: 1 }),
			};
		},
	},
	{
		key: 'thisMonth',
		getRange: () => ({
			start: startOfMonth(new Date()),
			end: endOfMonth(new Date()),
		}),
	},
	{
		key: 'thisYear',
		getRange: () => ({
			start: startOfYear(new Date()),
			end: endOfYear(new Date()),
		}),
	},
];

const rangeLabel = computed(() => {
	const { start, end } = model.value;
	if (!start) return t('components.filter.selectDateRange');
	// Single date: only start, or start and end on same day
	if (!end || start.getTime() === end.getTime()) {
		return getFormattedDate(start, 'dd-MM-yyyy');
	}
	return `${getFormattedDate(start, 'dd-MM-yyyy')} - ${getFormattedDate(end, 'dd-MM-yyyy')}`;
});

// Mobile: sm breakpoint (640px)
const isMobile = ref(false);
const checkMobile = () => {
	isMobile.value = typeof window !== 'undefined' && window.innerWidth < 640;
};
onMounted(() => {
	checkMobile();
	if (typeof window !== 'undefined') window.addEventListener('resize', checkMobile);
});
onUnmounted(() => {
	if (typeof window !== 'undefined') window.removeEventListener('resize', checkMobile);
});

// Mobile USelect: presets + custom option
const presetSelectItems = computed(() => [
	...presets.map((p) => ({ value: p.key, label: t(`components.dateRange.${p.key}`) })),
	{ value: 'custom', label: t('components.dateRange.custom') },
]);

const selectedPresetKey = computed(() => {
	const r = model.value;
	if (!r?.start || !r?.end) return 'custom';
	const matched = presets.find((preset) => {
		const presetRange = preset.getRange();
		return r.start!.getTime() === presetRange.start.getTime() && r.end!.getTime() === presetRange.end.getTime();
	});
	return matched?.key ?? 'custom';
});

const onPresetSelect = (value: string) => {
	if (value === 'custom') {
		popoverOpen.value = true;
		return;
	}
	const preset = presets.find((p) => p.key === value);
	if (preset) applyPreset(preset);
};

const popoverOpen = ref(false);

// Draft range for calendar popover; only committed to model on Apply or when picker emits close
const draftRange = ref<Range>({ start: undefined, end: undefined });

watch(popoverOpen, (open) => {
	if (open) {
		draftRange.value = {
			start: model.value?.start,
			end: model.value?.end,
		};
	}
});

// Adapter for ZDateRangePicker (expects start/end as Date | null)
const draftForPicker = computed<PickerDateRange | null>(() => ({
	start: draftRange.value?.start ?? null,
	end: draftRange.value?.end ?? null,
}));

const onDraftUpdate = (v: PickerDateRange | null) => {
	if (!v) {
		draftRange.value = { start: undefined, end: undefined };
		return;
	}
	draftRange.value = {
		start: v.start ?? undefined,
		end: v.end ?? undefined,
	};
};

const isPresetActive = (preset: (typeof presets)[0]) => {
	const r = model.value;
	if (!r?.start || !r?.end) return false;
	const presetRange = preset.getRange();
	return r.start.getTime() === presetRange.start.getTime() && r.end.getTime() === presetRange.end.getTime();
};

const applyPreset = (preset: (typeof presets)[0]) => {
	model.value = preset.getRange();
};

const applyCalendar = () => {
	const { start, end } = draftRange.value ?? {};
	// Commit single date (start only) or range (start + end; end defaults to start when missing)
	if (start) {
		model.value = { start, end: end ?? start };
	}

	popoverOpen.value = false;
};
</script>
