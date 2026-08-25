import type { ProductImportResp } from '~/repository/modules/product/product';

type Translate = (key: string, params?: Record<string, unknown>) => string;

export type ProductImportSummary = {
	message: string;
	failed: boolean;
};

export function resolveProductImportSummary(
	result: ProductImportResp,
	t: Translate,
): ProductImportSummary {
	const created = result.created ?? 0;
	const updated = result.updated ?? 0;
	const failed = result.failed ?? 0;
	const messages = [
		failed > 0
			? t('import.summaryWithFailures', { failed })
			: t('import.summary', { created, updated }),
	];

	if (result.images_attached > 0) {
		messages.push(t('import.imagesAttached', { count: result.images_attached }));
	}

	if (result.image_warnings.length > 0) {
		messages.push(
			t('import.imageWarnings', {
				count: result.image_warnings.length,
			}),
			...result.image_warnings
				.map((warning) =>
					t('import.imageWarningDetail', {
						row: warning.row,
						code: warning.code ?? '—',
						message: warning.message,
					}),
				),
		);
	}

	return { message: messages.join('\n'), failed: failed > 0 };
}
