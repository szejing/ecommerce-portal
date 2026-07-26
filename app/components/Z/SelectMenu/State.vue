<template>
	<USelectMenu
		v-model="selectedValue"
		:items="stateOptions"
		:multiple="multiple"
		value-key="value"
		label-key="label"
		size="md"
		class="w-full"
		:placeholder="placeholderText"
	>
		<template v-if="slots.default" #default>
			<slot :values="displayValues" :state-label="stateLabel" :deselect="deselect" :clear-all="clearAll" :placeholder="placeholderText" />
		</template>
	</USelectMenu>
</template>

<script lang="ts" setup>
import { mergeMalaysiaStateOptions } from '~/utils/data/malaysia-states';

const props = withDefaults(
	defineProps<{
		/** Malaysia state/territory name; must match a built-in or merged option value. */
		stateName?: string;
		/** When `multiple` is true, the selected list (e.g. shipping zone). */
		stateNames?: string[];
		multiple?: boolean;
		/** Shown in the trigger and passed to the default slot; defaults to the single-state i18n string. */
		placeholder?: string;
	}>(),
	{
		stateName: '',
		stateNames: () => [],
		multiple: false,
	},
);

const emit = defineEmits<{
	'update:stateName': [value: string];
	'update:stateNames': [value: string[]];
}>();

const { t } = useI18n();
const slots = useSlots();

const displayValues = computed(() => (props.multiple ? [...props.stateNames] : props.stateName ? [props.stateName] : []));

const stateOptions = computed(() => mergeMalaysiaStateOptions(displayValues.value));

function stateLabel(value: string): string {
	return stateOptions.value.find((o) => o.value === value)?.label ?? value;
}

const placeholderText = computed(() => props.placeholder ?? t('components.selectMenu.selectState'));

function deselect(v: string) {
	if (props.multiple) {
		emit(
			'update:stateNames',
			props.stateNames.filter((x) => x !== v),
		);
	} else if (v === props.stateName) {
		emit('update:stateName', '');
	}
}

function clearAll() {
	if (props.multiple) {
		emit('update:stateNames', []);
	} else {
		emit('update:stateName', '');
	}
}

const selectedValue = computed({
	get: () => {
		if (props.multiple) {
			return props.stateNames;
		}
		return props.stateName || undefined;
	},
	set: (v: string | string[] | undefined) => {
		if (props.multiple) {
			const next = Array.isArray(v) ? v : v ? [v] : [];
			emit('update:stateNames', next);
		} else {
			const s = (typeof v === 'string' ? v : Array.isArray(v) ? (v[0] ?? '') : '').trim();
			emit('update:stateName', s);
		}
	},
});
</script>

<style scoped></style>
