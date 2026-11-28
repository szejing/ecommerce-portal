<template>
	<ZPagePanel id="ui-buttons" title="Buttons">
		<div class="grid gap-3 lg:gap-10">
			<h2>PRIMARY COLOR</h2>
			<UButton block class="max-lg:min-h-11" size="md" color="primary" variant="solid">Submit</UButton>
			<UButton block class="max-lg:min-h-11" size="md" color="primary" variant="outline">Submit</UButton>
			<UButton block class="max-lg:min-h-11" size="md" color="primary" variant="outline" disabled>Submit</UButton>

			<h2>GREEN COLOR</h2>
			<UButton block class="max-lg:min-h-11" size="md" color="success" variant="solid">Submit</UButton>
			<UButton block class="max-lg:min-h-11" size="md" color="success" variant="outline">Submit</UButton>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup></script>

<style scoped></style>
