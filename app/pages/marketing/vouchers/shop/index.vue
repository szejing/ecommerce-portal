<template>
	<ZSectionVoucherListing kind="shop" />
</template>

<script lang="ts" setup>
const { t } = useI18n();
useHead({ title: () => t('pages.shopVouchersTitle') });
</script>
