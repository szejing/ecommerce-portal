<script setup lang="ts">
import type { AdmissionHistoryRow } from '~/utils/types/event-management';

defineProps<{ rows: AdmissionHistoryRow[]; total: number; busy: boolean; failed: boolean }>();
const open = defineModel<boolean>('open', { required: true });
const page = defineModel<number>('page', { required: true });
const emit = defineEmits<{ retry: [] }>();
const { t, d } = useI18n();
</script>

<template>
	<UModal v-model:open="open" :title="t('eventManagement.admission.title')">
		<template #body>
			<p v-if="busy" aria-live="polite">{{ t('eventManagement.admission.loading') }}</p>
			<UAlert v-else-if="failed" color="error" :title="t('eventManagement.admission.failed')">
				<template #actions><UButton variant="soft" @click="emit('retry')">{{ t('eventManagement.retry') }}</UButton></template>
			</UAlert>
			<p v-else-if="!rows.length" class="text-muted">{{ t('eventManagement.admission.empty') }}</p>
			<ul v-else class="divide-y divide-default">
				<li v-for="row in rows" :key="row.id" class="flex flex-wrap items-center justify-between gap-2 py-3">
					<UBadge variant="soft">{{ t(`eventManagement.ticketStatus.${row.to_status}`) }}</UBadge>
					<p class="text-sm text-muted">{{ d(new Date(row.created_at), { dateStyle: 'short', timeStyle: 'medium' }) }}<span v-if="row.staff_id"> · {{ row.staff_id }}</span></p>
				</li>
			</ul>
			<UPagination v-if="total > 25" v-model:page="page" :total="total" :items-per-page="25" />
		</template>
	</UModal>
</template>
