<template>
	<template v-for="(group, groupIndex) in navigations" :key="groupIndex">
		<div v-for="(link, linkIndex) in group.links" :key="linkIndex" class="flex flex-col">
			<!-- link with children -->
			<div v-if="link.children && link.children.length > 0">
				<ZNavigationCollapsible
					:id="groupIndex * 1000 + linkIndex"
					:navigate="{
						title: t(link.label),
						icon: link.icon,
						to: link.to,
						isCollapsed: false,
						children: [],
					}"
					:collapsed="collapsedState[groupIndex * 1000 + linkIndex] ?? false"
					:item="{
						title:
							'px-4 py-3 mx-2 rounded-md text-base font-light cursor-pointer text-secondary-100 bg-transparent hover:bg-main-50 hover:text-secondary-700 hover:font-semibold transition duration-500 ease-in-out',
						icon: '',
					}"
					@toggle="toggleCollapse"
				>
					<template #content>
						<div v-for="(child, childIndex) in link.children" :key="childIndex" class="flex flex-col">
							<NuxtLink :to="child.to" class="active-link" exact-active-class="exact-active-link">
								{{ child.label }}
							</NuxtLink>
						</div>
					</template>
				</ZNavigationCollapsible>
			</div>

			<!-- link without children -->
			<NuxtLink v-else :to="link.to" class="active-link" exact-active-class="exact-active-link">
				<div class="flex items-center gap-4">
					<UIcon v-if="link.icon" :name="link.icon" class="w-5 h-5" />
					{{ t(link.label) }}
				</div>
			</NuxtLink>
		</div>
	</template>
</template>

<script lang="ts" setup>
const { t } = useI18n();
const appUiStore = useAppUiStore();

const { navigations } = storeToRefs(appUiStore);

const collapsedState = ref<Record<number, boolean>>({});

const toggleCollapse = (id: number) => {
	collapsedState.value[id] = !(collapsedState.value[id] ?? false);
};
</script>

<style scoped>
/**************************** sidebar styling ****************************/

.active-link {
	padding: 0.75rem 1rem;
	margin: 0 0.5rem;
	border-radius: 0.375rem;
	font-size: 1rem;
	font-weight: 300;
	cursor: pointer;
	color: var(--color-secondary-100);
	background-color: transparent;
	transition: all 500ms ease-in-out;
}

.active-link:hover {
	background-color: var(--color-main-50);
	color: var(--color-secondary-700);
	font-weight: 600;
}

.exact-active-link {
	background-color: var(--color-main-50);
	color: var(--color-secondary-700);
	font-weight: 600;
}
</style>
