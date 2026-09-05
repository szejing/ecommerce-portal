import { getPaymentStatusColor as getCommonPaymentStatusColor, PaymentStatus, type UiBadgeColor } from 'yeppi-common';

type TranslateFn = (key: string) => string;

export const options_payment_status = [
	PaymentStatus.PAID,
	PaymentStatus.PENDING,
	PaymentStatus.PARTIALLY_PAID,
	PaymentStatus.PARTIALLY_REFUNDED,
	PaymentStatus.REFUNDED,
];

const PAYMENT_STATUS_PROGRESS: PaymentStatus[] = [
	PaymentStatus.PENDING,
	PaymentStatus.PARTIALLY_PAID,
	PaymentStatus.PAID,
];

export function getPaymentStatusOptions(t: TranslateFn) {
	return [
		{ value: PaymentStatus.PAID, label: t('options.paid') },
		{ value: PaymentStatus.PENDING, label: t('options.pending') },
		{ value: PaymentStatus.PARTIALLY_PAID, label: t('options.partiallyPaid') },
		{ value: PaymentStatus.PARTIALLY_REFUNDED, label: t('options.partiallyRefunded') },
		{ value: PaymentStatus.REFUNDED, label: t('options.refunded') },
	];
}

export function getNextPaymentStatus(current: PaymentStatus | string | undefined): PaymentStatus | undefined {
	const index = PAYMENT_STATUS_PROGRESS.indexOf(current as PaymentStatus);
	if (index < 0 || index >= PAYMENT_STATUS_PROGRESS.length - 1) {
		return undefined;
	}
	return PAYMENT_STATUS_PROGRESS[index + 1];
}

export function canCompletePaymentStatus(current: PaymentStatus | string | undefined): boolean {
	if (!current) {
		return false;
	}
	return current !== PaymentStatus.PAID && current !== PaymentStatus.REFUNDED && current !== PaymentStatus.PARTIALLY_REFUNDED;
}

export const getPaymentStatusColor = (status: string): UiBadgeColor | undefined => {
	if (status === 'All') {
		return 'neutral';
	}

	return getCommonPaymentStatusColor(status);
};
