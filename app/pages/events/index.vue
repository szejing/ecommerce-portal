<script setup lang="ts">
import { EventStatus } from 'yeppi-common';

const { t } = useI18n();

type EventRow = { id: string; name: string; venue: string; starts_at: string; timezone: string; status: EventStatus };
const page = ref(1);
const { data, status, error, refresh } = await useFetch<{ events: EventRow[]; total: number }>('/merchant/events', {
	query: { skip: computed(() => (page.value - 1) * 25) },
});
const badgeColor = { draft: 'neutral', published: 'success', cancelled: 'error' } as const;
const time = (row: EventRow) => new Intl.DateTimeFormat(undefined, {
	dateStyle: 'medium', timeStyle: 'short', timeZone: row.timezone,
}).format(new Date(row.starts_at));
</script>

<template>
	<main class="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
		<header class="flex flex-wrap items-center justify-between gap-4">
			<div>
				<h1 class="text-2xl font-semibold text-highlighted">{{ t('eventManagement.title') }}</h1>
				<p class="mt-1 text-sm text-muted">{{ t('eventManagement.manage') }}</p>
			</div>
			<UButton to="/events/new" icon="i-lucide-plus" class="min-h-11">{{ t('eventManagement.new') }}</UButton>
		</header>
		<UAlert v-if="error" color="error" :title="t('eventManagement.listFailed')">
			<template #actions><UButton variant="soft" @click="refresh()">{{ t('eventManagement.retry') }}</UButton></template>
		</UAlert>
		<div v-else-if="status === 'pending'" class="space-y-3" aria-busy="true" :aria-label="t('eventManagement.loading')">
			<USkeleton v-for="row in 3" :key="row" class="h-20 w-full" />
		</div>
		<UCard v-else-if="!data?.events.length">
			<p class="font-medium text-highlighted">{{ t('eventManagement.empty') }}</p>
			<p class="mt-1 text-sm text-muted">{{ t('eventManagement.emptyHelp') }}</p>
		</UCard>
		<UCard v-else :ui="{ body: 'p-0 sm:p-0' }">
			<ul class="divide-y divide-default">
				<li v-for="row in data.events" :key="row.id">
					<NuxtLink :to="`/events/${row.id}`" class="flex min-h-20 items-center justify-between gap-4 rounded-md p-4 hover:bg-elevated focus-visible:outline-2 focus-visible:outline-primary">
						<div class="min-w-0 space-y-1">
							<p class="break-words font-medium text-highlighted">{{ row.name }}</p>
							<p class="text-sm text-muted">{{ time(row) }}<span v-if="row.venue"> · {{ row.venue }}</span></p>
						</div>
						<UBadge :color="badgeColor[row.status]" variant="soft" class="capitalize">{{ t(`eventManagement.status.${row.status}`) }}</UBadge>
					</NuxtLink>
				</li>
			</ul>
		</UCard>
		<UPagination v-if="(data?.total ?? 0) > 25" v-model:page="page" :total="data?.total ?? 0" :items-per-page="25" />
	</main>
</template>
