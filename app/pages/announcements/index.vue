<template>
	<ZPagePanel id="announcements" title="Announcements">
		<div class="space-y-4">
			<p class="text-muted">
				Reach merchants on this platform via email or in-app announcement.
			</p>
			<div class="flex flex-wrap gap-3">
				<UButton to="/announcements/email-blast" color="primary">
					Email Blast
				</UButton>
				<UButton to="/announcements/in-app" color="primary" variant="soft">
					In-app Announcement
				</UButton>
			</div>
		</div>
	</ZPagePanel>
</template>

<script setup lang="ts">
definePageMeta({
	layout: 'default',
});
</script>
