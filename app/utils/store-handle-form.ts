export function sanitizeStoreHandleInput(value: string | undefined): string {
	return String(value ?? '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}
