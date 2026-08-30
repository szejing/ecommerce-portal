import type { Country } from '~/utils/types/country';

export const useDataStore = defineStore('dataStore', {
	state: () => ({
		countries: [] as Country[],
	}),
	actions: {
		async getCountries() {
			const { $api } = useNuxtApp();
			const { data } = await $api.country.getCountries({
				$top: 100,
			});
			this.countries = data;
		},
	},
});
