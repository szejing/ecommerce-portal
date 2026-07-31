import {
	isValidOptionalGoogleAnalyticsMeasurementId,
	normalizeGoogleAnalyticsMeasurementId,
} from 'yeppi-common';

export type GoogleAnalyticsSettingResolution =
	| { ok: true; value: string }
	| { ok: false; errorKey: 'pages.googleAnalytics.invalidMeasurementId' };

export function resolveGoogleAnalyticsSetting(
	input: unknown,
): GoogleAnalyticsSettingResolution {
	const value = normalizeGoogleAnalyticsMeasurementId(input);
	if (!isValidOptionalGoogleAnalyticsMeasurementId(value)) {
		return {
			ok: false,
			errorKey: 'pages.googleAnalytics.invalidMeasurementId',
		};
	}
	return { ok: true, value };
}
