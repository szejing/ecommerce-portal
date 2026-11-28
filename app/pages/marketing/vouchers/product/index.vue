<template>
	<ZSectionVoucherListing kind="product" />
</template>

<script lang="ts" setup>
const { t } = useI18n();
useHead({ title: () => t('pages.productVouchersTitle') });
</script>
