export function buildWhatsAppMeUrl(dialCode?: string | null, phoneNo?: string | null): string | null {
	const dialDigits = (dialCode ?? '').replace(/\D/g, '');
	const phoneDigits = (phoneNo ?? '').replace(/\D/g, '');
	const normalizedPhoneDigits = dialDigits ? phoneDigits.replace(/^0/, '') : phoneDigits;
	const digits = `${dialDigits}${normalizedPhoneDigits}`;
	if (digits.length < 8) return null;
	return `https://wa.me/${digits}`;
}
