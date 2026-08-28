<template>
	<USelectMenu
		v-model="selectedValue"
		v-model:search-term="searchTerm"
		:items="countryItems"
		:multiple="multiple"
		:search-input="{
			placeholder: 'Search country…',
			icon: 'i-lucide-search',
		}"
		:filter-fields="['display_name', 'iso2', 'dial_code']"
		size="md"
		class="w-full"
		:placeholder="placeholderText"
		value-key="iso2"
		label-key="label"
	>
		<template v-if="slots.default" #default>
			<slot :values="displayValues" :country-label="countryLabel" :deselect="deselect" :clear-all="clearAll" :placeholder="placeholderText" />
		</template>
	</USelectMenu>
</template>

<script lang="ts" setup>
import { useDataStore } from '~/stores/Data/Data';
import type { Country } from '~/utils/types/country';

const { t } = useI18n();
const slots = useSlots();

const searchTerm = ref('');
const dataStore = useDataStore();

const props = withDefaults(
	defineProps<{
		country?: Country | undefined;
		/** When `multiple` is true, selected ISO 3166-1 alpha-2 codes (e.g. shipping zone). */
		iso2Codes?: string[];
		multiple?: boolean;
		placeholder?: string;
	}>(),
	{
		iso2Codes: () => [],
		multiple: false,
	},
);

const emit = defineEmits<{
	'update:country': [value: Country | undefined];
	'update:iso2Codes': [value: string[]];
}>();

onMounted(() => {
	if (dataStore.countries.length === 0) {
		void dataStore.getCountries();
	}
});

const displayValues = computed(() => {
	if (props.multiple) {
		return [...props.iso2Codes];
	}
	return props.country?.iso2 ? [props.country.iso2] : [];
});

const placeholderText = computed(() => props.placeholder ?? t('components.selectMenu.selectCountry'));

const countryItems = computed(() => {
	const rows = dataStore.countries.map((country) => ({
		...country,
		label: country.display_name,
	}));
	for (const iso2 of displayValues.value) {
		const code = iso2.trim().toUpperCase();
		if (code && !rows.some((r) => r.iso2 === code)) {
			rows.unshift({
				iso2: code,
				dial_code: '',
				display_name: code,
				is_active: false,
				states: [],
				label: code,
			});
		}
	}
	return rows;
});

function countryLabel(iso2: string): string {
	return countryItems.value.find((c) => c.iso2 === iso2)?.display_name ?? iso2;
}

function deselect(v: string) {
	if (props.multiple) {
		emit(
			'update:iso2Codes',
			props.iso2Codes.filter((x) => x !== v),
		);
		return;
	}
	if (v === props.country?.iso2) {
		emit('update:country', undefined);
	}
}

function clearAll() {
	if (props.multiple) {
		emit('update:iso2Codes', []);
	} else {
		emit('update:country', undefined);
	}
}

const selectedValue = computed({
	get: () => {
		if (props.multiple) {
			return props.iso2Codes;
		}
		return props.country?.iso2;
	},
	set: (iso2: string | string[] | undefined) => {
		if (props.multiple) {
			const next = Array.isArray(iso2) ? iso2 : iso2 ? [iso2] : [];
			emit(
				'update:iso2Codes',
				next.map((v) => v.trim().toUpperCase()).filter(Boolean),
			);
			return;
		}
		if (!iso2 || Array.isArray(iso2)) {
			emit('update:country', undefined);
			return;
		}
		const c = dataStore.countries.find((x) => x.iso2 === iso2);
		emit('update:country', c ? (JSON.parse(JSON.stringify(c)) as Country) : undefined);
	},
});
</script>

<style scoped></style>
