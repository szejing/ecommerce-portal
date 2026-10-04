<template>
	<FormProductDetailPage :key="String(route.params.slug)" combo-only />
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'product-detail' });
const route = useRoute();
</script>
