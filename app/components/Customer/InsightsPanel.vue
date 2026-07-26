<template>
	<div class="space-y-6">
		<form class="space-y-4" @submit.prevent="handleAdd">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<UFormField :label="t('pages.customerInsights.trait')" name="trait" required>
					<ZSelectMenuCustomerInsightTrait v-model="form.key" />
				</UFormField>

				<UFormField :label="t('pages.customerInsights.severity')" name="severity">
					<USelectMenu v-model="form.severity" :items="severityOptions" value-key="value" label-key="label" variant="formTrigger" />
				</UFormField>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<UFormField :label="t('pages.customerInsights.confidence')" name="confidence">
					<USelectMenu v-model="form.confidence" :items="confidenceOptions" value-key="value" label-key="label" variant="formTrigger" />
				</UFormField>

				<UFormField :label="t('pages.customerInsights.category')" name="category">
					<UInput :model-value="categoryLabel" readonly />
				</UFormField>
			</div>

			<UFormField :label="t('pages.customerInsights.note')" name="note">
				<UTextarea v-model="form.note" :placeholder="t('pages.customerInsights.notePlaceholder')" :rows="3" />
			</UFormField>

			<div class="flex justify-end">
				<UButton type="submit" color="primary" :loading="processing" :disabled="!form.key">
					{{ t('pages.customerInsights.addInsight') }}
				</UButton>
			</div>
		</form>

		<div v-if="!insights.length" class="flex flex-col items-center justify-center py-8 gap-2">
			<UIcon name="i-heroicons-light-bulb" class="w-10 h-10 text-neutral-300" />
			<p class="text-sm text-muted">{{ t('pages.customerInsights.empty') }}</p>
		</div>

		<div v-else class="space-y-3">
			<UCard v-for="insight in sortedInsights" :key="insight.id" class="bg-elevated/50">
				<div class="flex items-start justify-between gap-4">
					<div class="space-y-2 min-w-0">
						<div class="flex flex-wrap items-center gap-2">
							<UBadge :color="customerInsightSeverityColor(insight.severity)" variant="subtle" size="sm">
								{{ customerInsightLabel(t, insight.key) }}
							</UBadge>
							<UBadge color="neutral" variant="outline" size="sm">
								{{ t(`pages.customerInsights.categories.${insight.category}`) }}
							</UBadge>
							<UBadge v-if="insight.confidence" color="neutral" variant="subtle" size="sm">
								{{ t(`pages.customerInsights.confidences.${insight.confidence}`) }}
							</UBadge>
						</div>

						<p v-if="insight.note" class="text-sm text-default whitespace-pre-wrap">{{ insight.note }}</p>

						<p class="text-xs text-muted">
							{{ formatInsightDate(insight.created_at) }}
						</p>
					</div>

					<UButton
						icon="i-heroicons-trash"
						color="error"
						variant="ghost"
						size="sm"
						:loading="processing"
						:disabled="processing"
						:aria-label="t('pages.customerInsights.removeInsight')"
						@click="emit('remove', insight.id)"
					/>
				</div>
			</UCard>
		</div>
	</div>
</template>

<script lang="ts" setup>
import type { CustomerInsight, CustomerInsightConfidence, CustomerInsightKey, CustomerInsightSeverity } from 'yeppi-common';
import {
	customerInsightConfidenceOptions,
	customerInsightLabel,
	customerInsightSeverityColor,
	customerInsightSeverityOptions,
	customerInsightTraitOptions,
} from '~/utils/options/customer-insights';

const props = defineProps<{
	customerNo: string;
	insights: CustomerInsight[];
	processing?: boolean;
}>();

const emit = defineEmits<{
	add: [payload: { key: CustomerInsightKey; note?: string; confidence?: string; severity?: string }];
	remove: [insightId: string];
}>();

const { t } = useI18n();

const form = reactive({
	key: null as CustomerInsightKey | null,
	note: '',
	confidence: undefined as CustomerInsightConfidence | undefined,
	severity: undefined as CustomerInsightSeverity | undefined,
});

const severityOptions = computed(() => customerInsightSeverityOptions(t));
const confidenceOptions = computed(() => customerInsightConfidenceOptions(t));

const selectedTrait = computed(() => customerInsightTraitOptions(t).find((item) => item.value === form.key) ?? null);

const categoryLabel = computed(() => {
	const category = selectedTrait.value?.category;
	return category ? t(`pages.customerInsights.categories.${category}`) : '—';
});

const sortedInsights = computed(() => [...props.insights].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

watch(selectedTrait, (trait) => {
	if (trait && !form.severity) {
		form.severity = trait.defaultSeverity;
	}
});

const formatInsightDate = (value: string) => {
	try {
		return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
	} catch {
		return value;
	}
};

const resetForm = () => {
	form.key = null;
	form.note = '';
	form.confidence = undefined;
	form.severity = undefined;
};

const handleAdd = () => {
	if (!form.key || !selectedTrait.value) return;

	emit('add', {
		key: form.key,
		note: form.note.trim() || undefined,
		confidence: form.confidence,
		severity: form.severity ?? selectedTrait.value.defaultSeverity,
	});

	resetForm();
};
</script>
