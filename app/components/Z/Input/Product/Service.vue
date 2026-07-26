<template>
	<div class="space-y-6">
		<!-- Requires booking -->
		<div class="flex items-start gap-3">
			<UCheckbox
				v-model="prodMetadata.requires_booking"
				name="requires_booking"
				:label="t('components.zInput.requiresBooking')"
				color="success"
				@update:model-value="updateRequiresBooking"
			/>
		</div>

		<!-- Duration -->
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
			<div class="min-w-0">
				<label class="text-sm font-medium text-default">{{ t('components.zInput.duration') }}</label>
				<p class="text-sm text-muted">{{ t('components.zInput.durationDesc') }}</p>
			</div>
			<div class="w-full sm:w-40 shrink-0">
				<ZSelectMenuDuration :duration="prodMetadata.duration" @update:duration="updateDuration" />
			</div>
		</div>

		<!-- Off days -->
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
			<div class="min-w-0">
				<label class="text-sm font-medium text-default">{{ t('components.zInput.offDay') }}</label>
				<p class="text-sm text-muted">{{ t('components.zInput.offDayDesc') }}</p>
				<p class="text-xs text-muted mt-0.5">{{ t('components.zInput.offDayNote') }}</p>
			</div>
			<div class="w-full sm:w-48 shrink-0">
				<ZSelectMenuDays :days="offDayArray" @update:days="updateOffDay" />
			</div>
		</div>

		<!-- Operating hours -->
		<div class="flex flex-col gap-2">
			<label class="text-sm font-medium text-default">{{ t('components.zInput.operatingHours') }}</label>
			<p class="text-sm text-muted">{{ t('components.zInput.operatingHoursDesc') }}</p>
			<div class="flex items-start gap-3">
				<UCheckbox
					v-model="followOperationHour"
					name="follow_operation_hour"
					:label="t('components.zInput.followOperationHour')"
					color="primary"
					@update:model-value="updateFollowOperationHour"
				/>
			</div>
			<template v-if="followOperationHour">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2 text-muted">
					<span class="text-sm">{{ merchantStartTime || '–' }}</span>
					<span class="hidden sm:inline shrink-0" aria-hidden="true">–</span>
					<span class="text-sm">{{ merchantEndTime || '–' }}</span>
					<span v-if="!merchantStartTime && !merchantEndTime" class="text-sm">{{ t('components.zInput.merchantHoursNotSet') }}</span>
				</div>
			</template>
			<div v-else class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
				<div class="w-full sm:w-40 shrink-0">
					<ZSelectMenuTime :title="t('components.zInput.selectTime')" :time="prodMetadata.start_time" type="start" @update:time="updateStartTime" />
				</div>
				<span class="hidden sm:inline text-muted shrink-0" aria-hidden="true">–</span>
				<div class="w-full sm:w-40 shrink-0">
					<ZSelectMenuTime :title="t('components.zInput.selectTime')" :time="prodMetadata.end_time" type="end" @update:time="updateEndTime" />
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import type { ServiceMetadata } from 'yeppi-common';
import { GROUP_CODE, MERCHANT } from 'yeppi-common';

const { t } = useI18n();

type ServiceMetadataExtended = ServiceMetadata & { follow_operation_hour?: boolean };

const props = defineProps({
	metadata: {
		type: Object as PropType<Record<string, unknown> | undefined>,
		required: false,
	},
});

const emit = defineEmits(['update:productMetadata']);

const merchantInfoStore = useMerchantInfoStore();

const prodMetadata = computed({
	get() {
		if (props.metadata) {
			return props.metadata as ServiceMetadataExtended;
		}
		return {
			requires_booking: false,
			duration: '',
			start_time: '',
			end_time: '',
			off_day: null,
			follow_operation_hour: true,
		} as ServiceMetadataExtended;
	},
	set(value) {
		emitResolvedMetadata(value);
	},
});

const followOperationHour = computed({
	get() {
		return prodMetadata.value.follow_operation_hour !== false;
	},
	set(value: boolean) {
		updateFollowOperationHour(value);
	},
});

const merchantStartTime = computed(() => {
	const info = merchantInfoStore.getMerchantInfo(GROUP_CODE.INFO, MERCHANT.OPERATION_START_TIME);
	return info?.set_value ?? '';
});

const merchantEndTime = computed(() => {
	const info = merchantInfoStore.getMerchantInfo(GROUP_CODE.INFO, MERCHANT.OPERATION_END_TIME);
	return info?.set_value ?? '';
});

function emitResolvedMetadata(value: ServiceMetadataExtended) {
	const payload = { ...value };
	if (payload.follow_operation_hour !== false) {
		payload.start_time = merchantStartTime.value || null;
		payload.end_time = merchantEndTime.value || null;
	}
	emit('update:productMetadata', payload);
}

/** Normalize off_day (string | null from API) to string[] for ZSelectMenuDays. */
const offDayArray = computed({
	get(): string[] | null {
		const raw = prodMetadata.value.off_day;
		if (raw == null || raw === '') return null;
		if (Array.isArray(raw)) return raw as string[];
		return raw
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
	},
	set(value: string[] | null) {
		const next = value?.length ? value.join(',') : null;
		(prodMetadata.value as { off_day: string | null }).off_day = next;
		prodMetadata.value = JSON.parse(JSON.stringify(prodMetadata.value));
	},
});

const updateRequiresBooking = (value: boolean | 'indeterminate') => {
	prodMetadata.value.requires_booking = value === true;
	prodMetadata.value = JSON.parse(JSON.stringify(prodMetadata.value));
};

const updateDuration = (value: string) => {
	prodMetadata.value.duration = value;
	prodMetadata.value = JSON.parse(JSON.stringify(prodMetadata.value));
};

const updateOffDay = (value: string[]) => {
	offDayArray.value = value.length ? value : null;
};

const updateFollowOperationHour = (value: boolean | 'indeterminate') => {
	const next = value === true;
	(prodMetadata.value as ServiceMetadataExtended).follow_operation_hour = next;
	emitResolvedMetadata(JSON.parse(JSON.stringify(prodMetadata.value)));
};

const updateStartTime = (value: string) => {
	prodMetadata.value.start_time = value;
	prodMetadata.value = JSON.parse(JSON.stringify(prodMetadata.value));
};

const updateEndTime = (value: string) => {
	prodMetadata.value.end_time = value;
	prodMetadata.value = JSON.parse(JSON.stringify(prodMetadata.value));
};
</script>
