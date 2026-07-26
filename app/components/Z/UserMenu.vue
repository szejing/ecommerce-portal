<template>
	<ClientOnly>
		<UDropdownMenu
			:items="items"
			:content="{ align: 'center', collisionPadding: 12 }"
			:ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
		>
			<UButton
				v-bind="{
					...user,
					label: collapsed ? (user?.name?.[0] ?? '') : user?.name,
					trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down',
				}"
				color="neutral"
				variant="ghost"
				block
				:square="collapsed"
				:class="[
					'data-[state=open]:bg-elevated',
					{
						'rounded-full size-11 min-w-11 min-h-11 text-lg font-medium': collapsed,
					},
				]"
				:ui="{ trailingIcon: 'text-dimmed' }"
			/>

			<template #chip-leading="{ item }">
				<div class="inline-flex items-center justify-center shrink-0 size-5">
					<span
						class="rounded-full ring ring-bg bg-(--chip-light) dark:bg-(--chip-dark) size-2"
						:style="{
							'--chip-light': `var(--color-${(item as any).chip}-500)`,
							'--chip-dark': `var(--color-${(item as any).chip}-400)`,
						}"
					/>
				</div>
			</template>

			<template #item-trailing="{ item }">
				<UIcon v-if="isItemSelected(item)" name="i-lucide-check" class="shrink-0 size-5 text-primary" />
			</template>
		</UDropdownMenu>
		<template #fallback>
			<div
				:class="['flex w-full items-center gap-2 rounded-md px-2 py-2', collapsed ? 'justify-center size-11 min-w-11 min-h-11' : 'min-h-10']"
				aria-hidden="true"
			>
				<USkeleton class="size-8 shrink-0 rounded-full" />
				<template v-if="!collapsed">
					<div class="flex flex-1 flex-col gap-1">
						<USkeleton class="h-4 w-24" />
						<USkeleton class="h-3 w-12" />
					</div>
					<USkeleton class="size-4 shrink-0 rounded" />
				</template>
			</div>
		</template>
	</ClientOnly>
</template>

<script lang="ts" setup>
import type { DropdownMenuItem } from '@nuxt/ui';
import { useAuthStore } from '~/stores';
import { LOCALE_STORAGE_KEY } from '~/utils/constants/i18n';

defineProps<{
	collapsed?: boolean;
}>();

const { t, locale, setLocale } = useI18n();
const colorMode = useColorMode();
const runtimeConfig = useRuntimeConfig();
const authStore = useAuthStore();
const user = computed(() => authStore.user);

const appVersion = computed(() => {
	const version = runtimeConfig.public.version;
	return typeof version === 'string' && version.trim() ? version.trim() : '';
});

const switchLocale = (newLocale: 'en' | 'ms') => {
	if (import.meta.client) {
		try {
			localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
		} catch {
			// ignore
		}
		setLocale(newLocale);
	}
};

type SelectableValue = 'light' | 'dark' | 'en' | 'ms';

const isItemSelected = (item: DropdownMenuItem): boolean => {
	const value = (item as DropdownMenuItem & { value?: SelectableValue }).value;
	if (value === undefined) return false;
	if (value === 'light' || value === 'dark') return colorMode.value === value;
	if (value === 'en' || value === 'ms') return locale.value === value;
	return false;
};

const items = computed<DropdownMenuItem[][]>(() => {
	const groups: DropdownMenuItem[][] = [
		[
			{
				type: 'label',
				label: user.value?.name,
			},
			{
				label: t('nav.settings'),
				icon: 'i-lucide-settings',
				to: '/settings',
			},
		],
		[
			{
				label: t('nav.appearance'),
				icon: 'i-lucide-sun-moon',
				children: [
					{
						label: t('nav.light'),
						icon: 'i-lucide-sun',
						value: 'light' as const,
						onSelect(e: Event) {
							e.preventDefault();
							colorMode.preference = 'light';
						},
					},
					{
						label: t('nav.dark'),
						icon: 'i-lucide-moon',
						value: 'dark' as const,
						onSelect(e: Event) {
							e.preventDefault();
							colorMode.preference = 'dark';
						},
					},
				],
			},
		],
		[
			{
				label: t('common.language'),
				icon: 'i-lucide-languages',
				children: [
					{
						label: t('common.english'),
						icon: 'i-lucide-languages',
						value: 'en' as const,
						onSelect(e: Event) {
							e.preventDefault();
							switchLocale('en');
						},
					},
					{
						label: t('common.bahasaMelayu'),
						icon: 'i-lucide-languages',
						value: 'ms' as const,
						onSelect(e: Event) {
							e.preventDefault();
							switchLocale('ms');
						},
					},
				],
			},
		],
		[
			{
				label: t('nav.logOut'),
				icon: 'i-lucide-log-out',
				onSelect: async () => {
					await authStore.logout();
					navigateTo('/login');
				},
			},
		],
	];

	if (appVersion.value) {
		groups.push([
			{
				type: 'label',
				label: `v${appVersion.value}`,
			},
		]);
	}

	return groups;
});
</script>

<style></style>
