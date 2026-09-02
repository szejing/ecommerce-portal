const filledToastProgressClass = '[&_[data-slot=base]]:bg-white/25 [&_[data-slot=indicator]]:bg-white';

/** Desktop CRM toasts sit in the top-right, away from bottom action bars. */
export const toastToaster = {
	position: 'top-right',
} as const;

/** Solid success/error toast surfaces with a white countdown bar. */
export const toastFilledColorVariants = {
	success: {
		root: 'bg-success ring-0 text-inverted outline-success/25 focus-visible:outline-3 focus-visible:ring-success',
		title: 'text-inverted',
		description: 'text-inverted/90',
		icon: 'text-inverted',
		close: 'text-inverted hover:bg-white/10 hover:text-inverted',
		progress: filledToastProgressClass,
	},
	error: {
		root: 'bg-error ring-0 text-inverted outline-error/25 focus-visible:outline-3 focus-visible:ring-error',
		title: 'text-inverted',
		description: 'text-inverted/90',
		icon: 'text-inverted',
		close: 'text-inverted hover:bg-white/10 hover:text-inverted',
		progress: filledToastProgressClass,
	},
} as const;

export function isFilledToastColor(color: string | undefined): color is 'success' | 'error' {
	return color === 'success' || color === 'error';
}

export function getToastProgress(color: string | undefined) {
	if (!isFilledToastColor(color)) {
		return true;
	}

	return {
		color: 'white',
		ui: {
			base: 'bg-white/25',
			indicator: 'bg-white',
		},
	};
}
