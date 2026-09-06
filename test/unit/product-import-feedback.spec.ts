import { describe, expect, it } from 'bun:test';
import en from '../../i18n/locales/en.json';
import ms from '../../i18n/locales/ms.json';
import { resolveProductImportStoppedSummary, resolveProductImportSummary } from '../../app/utils/product-import-feedback';

const translate = (key: string, params?: Record<string, unknown>) =>
	`${key}:${JSON.stringify(params ?? {})}`;

describe('product import image feedback', () => {
	it('returns localized attached-image feedback', () => {
		expect(
			resolveProductImportSummary(
				{
					images_attached: 3,
					image_warnings: [],
				},
				translate,
			),
		).toEqual({
			failed: false,
			message:
				'import.summary:{"created":0,"updated":0}\nimport.imagesAttached:{"count":3}',
		});
	});

	it('surfaces image warnings without converting the import to an error', () => {
		expect(
			resolveProductImportSummary(
				{
					created: 1,
					failed: 0,
					images_attached: 0,
					image_warnings: [
						{
							row: 6,
							code: 'P-100',
							message: 'Product images could not be attached',
						},
					],
				},
				translate,
			),
		).toEqual({
			failed: false,
			message:
				'import.summary:{"created":1,"updated":0}\nimport.imageWarnings:{"count":1}\nimport.imageWarningDetail:{"row":6,"code":"P-100","message":"Product images could not be attached"}',
		});
	});

	it('reports a stopped import against the Import Unit total when it is known', () => {
		expect(resolveProductImportStoppedSummary(12, 40, translate)).toBe(
			'import.stoppedSummary:{"processed":12,"total":40}',
		);
	});

	it('reports a stopped import without inventing a total', () => {
		expect(resolveProductImportStoppedSummary(12, null, translate)).toBe(
			'import.stoppedSummaryUnknownTotal:{"processed":12}',
		);
		expect(resolveProductImportStoppedSummary(0, 0, translate)).toBe(
			'import.stoppedSummaryUnknownTotal:{"processed":0}',
		);
	});

	it('provides English and Malay image import messages', () => {
		for (const locale of [en, ms]) {
			expect(locale.import.summary).toBeTruthy();
			expect(locale.import.summaryWithFailures).toBeTruthy();
			expect(locale.import.imagesAttached).toBeTruthy();
			expect(locale.import.imageWarnings).toBeTruthy();
			expect(locale.import.imageWarningDetail).toBeTruthy();
		}
	});

	it('provides English and Malay Import Progress messages', () => {
		for (const locale of [en, ms]) {
			expect(locale.import.progressCount).toBeTruthy();
			expect(locale.import.progressPreparing).toBeTruthy();
			expect(locale.import.elapsed).toBeTruthy();
			expect(locale.import.stopImport).toBeTruthy();
			expect(locale.import.stoppedSummary).toBeTruthy();
			expect(locale.import.stoppedSummaryUnknownTotal).toBeTruthy();
		}
	});
});
