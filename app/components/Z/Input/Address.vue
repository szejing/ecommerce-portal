<template>
	<div class="space-y-4">
		<UFormField v-slot="{ error }" :label="t('components.zInput.address1')" name="address1" required>
			<p class="text-xs text-neutral-500 dark:text-neutral-400 my-1">{{ t('components.zInput.addressLine1Hint') }}</p>
			<UInput v-model="address1" :trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined" :placeholder="t('components.zInput.address1')" />
		</UFormField>

		<UFormField :label="t('components.zInput.address2')" name="address2">
			<UInput v-model="address2" :placeholder="t('components.zInput.address2')" />
		</UFormField>

		<UFormField :label="t('components.zInput.address3')" name="address3">
			<UInput v-model="address3" :placeholder="t('components.zInput.address3')" />
		</UFormField>

		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<UFormField v-slot="{ error }" :label="t('components.zInput.city')" name="city" required>
				<UInput v-model="city" :trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined" :placeholder="t('components.zInput.city')" />
			</UFormField>

			<UFormField v-slot="{ error }" :label="t('components.zInput.postalCode')" name="postal_code" required>
				<UInput v-model="postal_code" :trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined" :placeholder="t('components.zInput.postalCode')" />
			</UFormField>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<UFormField :label="t('components.zInput.state')" :name="stateFieldName" required>
				<p class="text-xs text-neutral-500 dark:text-neutral-400 my-1">{{ t('components.zInput.addressStateHint') }}</p>
				<USelect
					:model-value="stateSelectValue"
					:items="stateItems"
					value-attribute="value"
					class="w-full"
					:placeholder="t('components.selectMenu.selectState')"
					@update:model-value="onStateSelect"
				/>
			</UFormField>

			<UFormField :label="t('components.zInput.countryCode')" name="country_code" required>
				<p class="text-xs text-neutral-500 dark:text-neutral-400 my-1">{{ t('components.zInput.addressCountryHint') }}</p>
				<USelect
					:model-value="countrySelectValue"
					:items="countryItems"
					value-attribute="value"
					class="w-full"
					:placeholder="t('components.selectMenu.selectCountry')"
					@update:model-value="onCountrySelect"
				/>
			</UFormField>
		</div>

		<div v-if="requiredLatLng" class="space-y-2">
			<p class="text-xs text-neutral-500 dark:text-neutral-400">{{ t('components.zInput.addressCoordinatesHint') }}</p>
			<div class="flex flex-wrap items-center gap-2">
				<UButton color="primary" variant="soft" size="sm" :loading="geocodingLoading" :disabled="geocodingLoading" @click="onFillCoordsFromAddress">
					{{ t('components.zInput.fillCoordsFromAddress') }}
				</UButton>
				<UButton variant="outline" size="sm" :disabled="!addressQueryForMaps" @click="onOpenInGoogleMaps">
					{{ t('components.zInput.openInGoogleMaps') }}
				</UButton>
				<UButton variant="outline" size="sm" :disabled="geocodingLoading" @click="onUseMyLocation">
					{{ t('components.zInput.useMyLocation') }}
				</UButton>
			</div>
			<p class="text-xs text-neutral-500 dark:text-neutral-400">
				{{ t('components.zInput.osmAttribution') }}
			</p>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<UFormField v-slot="{ error }" :label="t('components.zInput.latitude')" name="latitude">
					<UInput v-model="latitude" :trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined" :placeholder="t('components.zInput.latitude')" />
				</UFormField>

				<UFormField v-slot="{ error }" :label="t('components.zInput.longitude')" name="longitude">
					<UInput v-model="longitude" :trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined" :placeholder="t('components.zInput.longitude')" />
				</UFormField>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { findPostcode } from 'malaysia-postcodes';
import MerchantRoutes from '~/repository/routes.client';
import { useDataStore } from '~/stores/Data/Data';
import { buildOutletAddressSearchQuery, googleMapsWebSearchUrl } from '~/utils/address-geocode';
import { mergeMalaysiaStateOptions } from '~/utils/data/malaysia-states';
import { ICONS } from '~/utils/icons';

const props = defineProps<{
	address1?: string;
	address2?: string;
	address3?: string;
	city?: string;
	postalCode?: string;
	countryCode?: string;
	stateName?: string;
	/** Form field name for state (e.g. "state" for outlet schema). */
	stateFieldName?: string;
	requiredLatLng?: boolean;
	longitude?: number | string | undefined;
	latitude?: number | string | undefined;
}>();

const emit = defineEmits([
	'update:address1',
	'update:address2',
	'update:address3',
	'update:city',
	'update:postalCode',
	'update:countryCode',
	'update:stateName',
	'update:longitude',
	'update:latitude',
]);

const stateFieldName = computed(() => props.stateFieldName ?? 'state_name');

const { t } = useI18n();
const toast = useToast();
const dataStore = useDataStore();
const geocodingLoading = ref(false);

const addressQueryForMaps = computed(() =>
	buildOutletAddressSearchQuery({
		address1: props.address1,
		address2: props.address2,
		address3: props.address3,
		postalCode: props.postalCode,
		city: props.city,
		stateName: props.stateName,
		countryCode: props.countryCode,
	}),
);

function onOpenInGoogleMaps() {
	const q = addressQueryForMaps.value.trim();
	if (!q) return;
	window.open(googleMapsWebSearchUrl(q), '_blank', 'noopener,noreferrer');
}

async function onFillCoordsFromAddress() {
	const q = addressQueryForMaps.value.trim();
	if (q.length < 5) {
		toast.add({ title: t('components.zInput.geocodeNeedAddress'), color: 'warning' });
		return;
	}
	geocodingLoading.value = true;
	try {
		const { latitude, longitude } = await $fetch<{ latitude: number; longitude: number }>(MerchantRoutes.Geocode.Search(), {
			query: { q },
		});
		emit('update:latitude', latitude);
		emit('update:longitude', longitude);
		toast.add({ title: t('components.zInput.geocodeSuccess'), color: 'success' });
	} catch (err: unknown) {
		const status = err && typeof err === 'object' && 'statusCode' in err ? (err as { statusCode?: number }).statusCode : undefined;
		if (status === 404) {
			toast.add({ title: t('components.zInput.geocodeNoResults'), color: 'warning' });
		} else {
			toast.add({ title: t('components.zInput.geocodeFailed'), color: 'error' });
		}
	} finally {
		geocodingLoading.value = false;
	}
}

function onUseMyLocation() {
	if (typeof navigator === 'undefined' || !navigator.geolocation) {
		toast.add({ title: t('components.zInput.geolocationUnavailable'), color: 'warning' });
		return;
	}
	navigator.geolocation.getCurrentPosition(
		(pos) => {
			emit('update:latitude', pos.coords.latitude);
			emit('update:longitude', pos.coords.longitude);
			toast.add({ title: t('components.zInput.geolocationSuccess'), color: 'success' });
		},
		() => {
			toast.add({ title: t('components.zInput.geolocationDenied'), color: 'warning' });
		},
		{ enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
	);
}

onMounted(() => {
	if (dataStore.countries.length === 0) {
		void dataStore.getCountries();
	}
});

const stateItems = computed(() => mergeMalaysiaStateOptions(props.stateName?.trim() ? [props.stateName.trim()] : []));

const stateSelectValue = computed(() => props.stateName?.trim() || undefined);

function onStateSelect(v: string | undefined) {
	emit('update:stateName', v?.trim() ?? '');
}

const countryItems = computed(() => {
	const rows = dataStore.countries.map((c) => ({ label: c.display_name, value: c.iso2 }));
	const code = props.countryCode?.trim().toUpperCase();
	if (code && !rows.some((r) => r.value === code)) {
		return [{ label: code, value: code }, ...rows];
	}
	return rows;
});

const countrySelectValue = computed(() => props.countryCode?.trim().toUpperCase() || undefined);

function onCountrySelect(v: string | undefined) {
	emit('update:countryCode', v?.trim().toUpperCase() ?? '');
}

const address1 = computed({
	get() {
		return props.address1;
	},
	set(value) {
		emit('update:address1', value);
	},
});

const address2 = computed({
	get() {
		return props.address2;
	},
	set(value) {
		emit('update:address2', value);
	},
});

const address3 = computed({
	get() {
		return props.address3;
	},
	set(value) {
		emit('update:address3', value);
	},
});

const city = computed({
	get() {
		return props.city;
	},
	set(value) {
		emit('update:city', value);
	},
});

const postal_code = computed({
	get() {
		return props.postalCode;
	},
	set(value) {
		const location = findPostcode(value ?? '');
		if (location) {
			emit('update:city', location.city);
			emit('update:stateName', location.state);
		}
		emit('update:postalCode', value);
	},
});

const longitude = computed({
	get() {
		return props.longitude;
	},
	set(value) {
		if (value != null || value != undefined) {
			emit('update:longitude', value);
		}
	},
});

const latitude = computed({
	get() {
		return props.latitude;
	},
	set(value) {
		if (value != null || value != undefined) {
			emit('update:latitude', value);
		}
	},
});
</script>

<style scoped></style>
