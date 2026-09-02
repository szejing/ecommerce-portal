/**
 * Keep in sync with yeppi-common/src/constants/malaysia-states.ts (EasyParcel Option B labels).
 */
const MALAYSIA_STATES = [
	'Johor',
	'Kedah',
	'Kelantan',
	'Melaka',
	'Negeri Sembilan',
	'Pahang',
	'Pulau Pinang',
	'Perak',
	'Perlis',
	'Sabah',
	'Sarawak',
	'Selangor',
	'Terengganu',
	'Kuala Lumpur',
	'Labuan',
	'Putrajaya',
] as const;

export type MalaysiaStateOption = { label: string; value: string };

/** 13 states + 3 federal territories (EasyParcel English labels). */
export const MALAYSIA_STATE_OPTIONS: MalaysiaStateOption[] = MALAYSIA_STATES.map(
	(value) => ({
		label: value,
		value,
	}),
);

/** Multiple states are stored in API `state` joined by `|` (names do not contain `|`). */
export const MALAYSIA_STATES_API_DELIMITER = '|';

export function parseStatesFromApi(value: string | undefined): string[] {
	if (!value?.trim()) {
		return [];
	}
	return value
		.split(MALAYSIA_STATES_API_DELIMITER)
		.map((s) => s.trim())
		.filter(Boolean);
}

export function serializeStatesForApi(states: string[]): string | undefined {
	const cleaned = states.map((s) => s.trim()).filter(Boolean);
	if (!cleaned.length) {
		return undefined;
	}
	return cleaned.join(MALAYSIA_STATES_API_DELIMITER);
}

export function mergeMalaysiaStateOptions(currentValues: string[]): MalaysiaStateOption[] {
	const base = [...MALAYSIA_STATE_OPTIONS];
	const extras = currentValues
		.map((s) => s.trim())
		.filter(Boolean)
		.filter((s) => !base.some((o) => o.value === s))
		.map((s) => ({ label: s, value: s }));
	return [...extras, ...base];
}
