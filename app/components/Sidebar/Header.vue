<template>
	<div class="cursor-pointer" @click="goToStoreProfile">
		<ClientOnly>
			<UUser :name="collapsed ? undefined : merchantId" :description="collapsed ? undefined : merchantName">
				<template #avatar>
					<ZImage
						v-if="thumbnail"
						:src="thumbnail"
						:alt="merchantName"
						:width="32"
						:height="32" />
					<div v-else class="flex size-8 shrink-0 items-center justify-center rounded-sm bg-neutral-100">
						<UIcon name="i-heroicons-building-storefront" class="size-4 shrink-0 text-neutral-400" />
					</div>
				</template>
			</UUser>
			<template #fallback>
				<div class="inline-flex items-center gap-3">
					<USkeleton class="size-8 shrink-0 rounded-full" />
					<div v-if="!collapsed" class="flex flex-1 flex-col gap-1">
						<USkeleton class="h-4 w-24" />
						<USkeleton class="h-3 w-16" />
					</div>
				</div>
			</template>
		</ClientOnly>
	</div>
</template>

<script lang="ts" setup>
import { GROUP_CODE, MERCHANT } from 'yeppi-common';

const merchantInfoStore = useMerchantInfoStore();

defineProps<{
	collapsed?: boolean;
}>();

const goToStoreProfile = () => navigateTo('/settings/store-profile');

const merchantName = computed(() => {
	return merchantInfoStore.getMerchantInfo(GROUP_CODE.INFO, MERCHANT.NAME)?.getString() ?? '';
});

const merchantId = computed(() => {
	return merchantInfoStore.getMerchantInfo(GROUP_CODE.INFO, MERCHANT.ID)?.getString() ?? '';
});

const thumbnail = computed(() => {
	return merchantInfoStore.getMerchantInfo(GROUP_CODE.INFO, MERCHANT.THUMBNAIL)?.getString() ?? '';
});
</script>

<style scoped>
.header-container {
	padding-left: 1rem;
	padding-right: 1rem;
}
</style>
