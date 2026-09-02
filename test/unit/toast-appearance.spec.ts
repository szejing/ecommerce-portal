import { describe, expect, it } from 'vitest';
import { getToastProgress, isFilledToastColor, toastFilledColorVariants, toastToaster } from '../../app/utils/toast-appearance';

describe('toast appearance', () => {
	it('places toasts in the top-right corner', () => {
		expect(toastToaster.position).toBe('top-right');
	});

	it('fills success and error toast backgrounds and keeps the countdown bar white', () => {
		expect(toastFilledColorVariants.success.root).toContain('bg-success');
		expect(toastFilledColorVariants.error.root).toContain('bg-error');
		expect(toastFilledColorVariants.success.progress).toContain('bg-white');
		expect(toastFilledColorVariants.error.progress).toContain('bg-white');
		expect(toastFilledColorVariants.success.title).toContain('text-inverted');
		expect(toastFilledColorVariants.error.icon).toContain('text-inverted');
	});

	it('uses a white progress bar only for filled success and error toasts', () => {
		expect(isFilledToastColor('success')).toBe(true);
		expect(isFilledToastColor('error')).toBe(true);
		expect(isFilledToastColor('warning')).toBe(false);

		expect(getToastProgress('warning')).toBe(true);
		expect(getToastProgress('success')).toEqual({
			color: 'white',
			ui: {
				base: 'bg-white/25',
				indicator: 'bg-white',
			},
		});
		expect(getToastProgress('error')).toEqual({
			color: 'white',
			ui: {
				base: 'bg-white/25',
				indicator: 'bg-white',
			},
		});
	});
});
