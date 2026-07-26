<template>
	<USelectMenu
		v-model="selectedIso2"
		v-model:search-term="searchTerm"
		:items="countryItems"
		:search-input="{
			placeholder: 'Search country…',
			icon: 'i-lucide-search',
		}"
		:filter-fields="['display_name', 'iso2', 'dial_code']"
		size="md"
		class="w-full"
		:placeholder="t('components.selectMenu.selectCountry')"
		value-key="iso2"
	/>
</template>

<script lang="ts" setup>
import { useDataStore } from '~/stores/Data/Data';
import type { Country } from '~/utils/types/country';

const { t } = useI18n();

const searchTerm = ref('');
const dataStore = useDataStore();

const props = defineProps<{ country: Country | undefined }>();

const emit = defineEmits<{
	'update:country': [value: Country | undefined];
}>();

onMounted(() => {
	if (dataStore.countries.length === 0) {
		void dataStore.getCountries();
	}
});

const countryItems = computed(() => {
	return dataStore.countries.map((country) => ({
		...country,
		label: country.display_name,
	}));
});

const selectedIso2 = computed({
	get: () => props.country?.iso2,
	set: (iso2: string | undefined) => {
		if (!iso2) {
			emit('update:country', undefined);
			return;
		}
		const c = dataStore.countries.find((x) => x.iso2 === iso2);
		emit('update:country', c ? (JSON.parse(JSON.stringify(c)) as Country) : undefined);
	},
});
</script>

<style scoped></style>
