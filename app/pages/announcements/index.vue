<template>
	<ZPagePanel id="announcements" :title="t('nav.announcements')">
		<div class="space-y-4">
			<p class="max-w-3xl text-sm leading-5 text-muted">
				{{ t('platformAnnouncements.index.subtitle') }}
			</p>

			<div class="grid gap-4 lg:grid-cols-2">
				<UCard v-for="channel in channels" :key="channel.to">
					<div class="flex min-w-0 items-start gap-3">
						<div class="rounded-lg bg-elevated p-2">
							<UIcon :name="channel.icon" class="size-5 text-muted" />
						</div>
						<div class="min-w-0 flex-1 space-y-3">
							<div>
								<h2 class="font-semibold text-default">{{ channel.title }}</h2>
								<p class="mt-1 text-sm leading-5 text-muted">{{ channel.body }}</p>
							</div>
							<ul class="list-disc space-y-1 pl-5 text-sm leading-5 text-muted">
								<li v-for="point in channel.points" :key="point">{{ point }}</li>
							</ul>
							<UButton
								:to="channel.to"
								color="primary"
								class="min-h-11 w-full justify-center sm:w-auto"
							>
								{{ t('platformAnnouncements.index.open') }}
							</UButton>
						</div>
					</div>
				</UCard>
			</div>
		</div>
	</ZPagePanel>
</template>

<script setup lang="ts">
import { ICONS } from '~/utils/icons';

definePageMeta({
	layout: 'default',
});

const { t } = useI18n();

useHead({ title: () => t('nav.announcements') });

const channels = computed(() => [
	{
		to: '/announcements/email-blast',
		icon: ICONS.DOCUMENT,
		title: t('nav.emailBlast'),
		body: t('platformAnnouncements.index.emailBody'),
		points: [
			t('platformAnnouncements.index.emailPoint1'),
			t('platformAnnouncements.index.emailPoint2'),
			t('platformAnnouncements.index.emailPoint3'),
		],
	},
	{
		to: '/announcements/in-app',
		icon: ICONS.BELL,
		title: t('nav.inAppAnnouncement'),
		body: t('platformAnnouncements.index.inAppBody'),
		points: [
			t('platformAnnouncements.index.inAppPoint1'),
			t('platformAnnouncements.index.inAppPoint2'),
			t('platformAnnouncements.index.inAppPoint3'),
		],
	},
]);
</script>
