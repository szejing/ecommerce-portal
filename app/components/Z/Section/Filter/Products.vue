<template>
	<div class="min-w-0 flex-1">
		<label class="sr-only" for="products-listing-search">{{ t('components.filter.searchLabel') }}</label>
		<UInput
			id="products-listing-search"
			:model-value="filters.query"
			:placeholder="t('components.filter.searchProduct')"
			:icon="ICONS.SEARCH_ROUNDED"
			@update:model-value="productStore.setSearch"
		/>
	</div>
</template>

<script lang="ts" setup>
import { ICONS } from '~/utils/icons';

const { t } = useI18n();
const productStore = useProductStore();
const { filters } = storeToRefs(productStore);
</script>
