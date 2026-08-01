type UnknownRecord = Record<string, unknown>;

const hasOwn = (value: UnknownRecord, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key);
const isRecord = (value: unknown): value is UnknownRecord => value !== null && typeof value === 'object' && !Array.isArray(value);

function pick(value: unknown, keys: readonly string[]): UnknownRecord {
	const result = Object.create(null) as UnknownRecord;
	if (!isRecord(value)) return result;
	for (const key of keys) {
		if (hasOwn(value, key)) result[key] = value[key];
	}
	return result;
}

function pickConfiguration(value: unknown): unknown {
	if (!isRecord(value)) return value;
	const configuration = pick(value, ['brand', 'merchantInfo', 'content', 'blocks']);
	for (const [key, keys] of [
		['brand', ['logoAssetId', 'primaryColor', 'secondaryColor']],
		['merchantInfo', ['companyName', 'companyAddress', 'companyPhone', 'companyEmail', 'companyWebsite']],
		['content', ['subject', 'greeting', 'introduction', 'footer']],
	] as const) {
		if (hasOwn(configuration, key)) configuration[key] = pick(configuration[key], keys);
	}
	if (Array.isArray(configuration.blocks)) {
		configuration.blocks = configuration.blocks.map((block) => {
			const picked = pick(block, ['id', 'enabled', 'props']);
			if (hasOwn(picked, 'props')) picked.props = pick(picked.props, []);
			return picked;
		});
	}
	return configuration;
}

function pickBody(body: unknown, keys: readonly string[]): UnknownRecord {
	const result = pick(body, keys);
	if (hasOwn(result, 'configuration')) result.configuration = pickConfiguration(result.configuration);
	return result;
}

export const pickDocumentTemplateDraftBody = (body: unknown) => pickBody(body, ['version', 'configuration']);
export const pickDocumentTemplatePreviewBody = (body: unknown) => pickBody(body, ['configuration']);
export const pickDocumentTemplatePublishBody = (body: unknown) => pickBody(body, ['version', 'revision_no', 'start_date', 'end_date']);
export const pickDocumentTemplateVersionBody = (body: unknown) => pickBody(body, ['version']);
