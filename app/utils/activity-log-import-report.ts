export type ImportReportType = 'product' | 'customer';

export type ImportReportFailedUnit = {
	row: number;
	code?: string;
	message: string;
};

export type ImportReport = {
	import_type: ImportReportType;
	file_name?: string;
	total: number;
	created: number;
	updated: number;
	failed: number;
	errors: ImportReportFailedUnit[];
};

const asNumber = (value: unknown, fallback = 0): number => {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === 'string' && value.trim() !== '') {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : fallback;
	}
	return fallback;
};

const asOptionalText = (value: unknown): string | undefined => {
	if (typeof value !== 'string') {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed ? trimmed : undefined;
};

const parseFailedUnit = (value: unknown): ImportReportFailedUnit | null => {
	if (!value || typeof value !== 'object') {
		return null;
	}

	const rowValue = (value as { row?: unknown }).row;
	const row = asNumber(rowValue, Number.NaN);
	if (!Number.isFinite(row)) {
		return null;
	}

	const message = asOptionalText((value as { message?: unknown }).message) ?? '';
	const unit = value as { code?: unknown; customer_no?: unknown };
	// Product Import persists `code`; Customer Import persists `customer_no` — both map to Import Unit code.
	const code = asOptionalText(unit.code) ?? asOptionalText(unit.customer_no);

	return {
		row,
		message,
		...(code ? { code } : {}),
	};
};

export const isImportReportMetadata = (metadata: unknown): metadata is Record<string, unknown> => {
	if (!metadata || typeof metadata !== 'object') {
		return false;
	}

	const importType = (metadata as { import_type?: unknown }).import_type;
	return importType === 'product' || importType === 'customer';
};

export const parseImportReport = (metadata: unknown): ImportReport | null => {
	if (!isImportReportMetadata(metadata)) {
		return null;
	}

	const errorsRaw = metadata.errors;
	const errors = Array.isArray(errorsRaw)
		? errorsRaw.map(parseFailedUnit).filter((item): item is ImportReportFailedUnit => item !== null)
		: [];

	return {
		import_type: metadata.import_type as ImportReportType,
		file_name: asOptionalText(metadata.file_name),
		total: asNumber(metadata.total),
		created: asNumber(metadata.created),
		updated: asNumber(metadata.updated),
		failed: asNumber(metadata.failed),
		errors,
	};
};

export const formatImportReportFailedUnitsForClipboard = (errors: ImportReportFailedUnit[]): string => {
	if (!errors.length) {
		return '';
	}

	const lines = ['row\tcode\tmessage', ...errors.map((error) => `${error.row}\t${error.code ?? ''}\t${error.message}`)];
	return lines.join('\n');
};
