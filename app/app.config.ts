import { theme } from '../theme';
import { toastFilledColorVariants } from './utils/toast-appearance';

export default defineAppConfig({
	// title: 'HeroesTech Solutions',
	// tagline: 'A modern web development company',
	// address: 'Floor D 20-08, Menara Mitraland 13A, Jalan PJU 5/1, Kota Damansara, 47810 Petaling Jaya',
	theme,
	ui: {
		strategy: 'merge',

		colors: {
			primary: theme.main,
		},

		//* * Card */
		card: {
			slots: {
				root: 'shadow-sm',
			},
		},

		//* * Input */
		input: {
			slots: {
				root: 'w-full',
			},
		},

		//* * UButton */
		button: {
			slots: {
				base: 'cursor-pointer',
			},
		},

		//* * UBadge */
		badge: {
			slots: {
				base: 'font-bold inline-flex items-center',
			},
			compoundVariants: [
				{
					color: 'primary',
					variant: 'solid',
					class: 'bg-primary text-inverted',
				},
				{
					color: 'primary',
					variant: 'outline',
					class: 'text-primary ring ring-inset ring-primary/50',
				},
				{
					color: 'primary',
					variant: 'soft',
					class: 'bg-primary/10 text-primary',
				},
				{
					color: 'primary',
					variant: 'subtle',
					class: 'bg-primary/10 text-primary ring ring-inset ring-primary/25',
				},
				{
					color: 'neutral',
					variant: 'solid',
					class: 'text-inverted bg-inverted',
				},
				{
					color: 'neutral',
					variant: 'outline',
					class: 'ring ring-inset ring-accented text-default bg-default',
				},
				{
					color: 'neutral',
					variant: 'soft',
					class: 'text-default bg-elevated',
				},
				{
					color: 'neutral',
					variant: 'subtle',
					class: 'ring ring-inset ring-accented text-default bg-elevated',
				},
				{
					size: 'xs',
					square: true,
					class: 'p-1',
				},
				{
					size: 'sm',
					square: true,
					class: 'p-1.5',
				},
				{
					size: 'md',
					square: true,
					class: 'p-2',
				},
				{
					size: 'lg',
					square: true,
					class: 'p-2',
				},
				{
					size: 'xl',
					square: true,
					class: 'p-2',
				},
			],
		},

		// SelectMenu
		selectMenu: {
			slots: {
				base: 'min-w-30 sm:min-w-40 cursor-pointer',
				content: 'min-w-fit',
				trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200',
			},
			variants: {
				variant: {
					// Matches ClassificationSection category-picker-trigger (border, radius, bg, hover)
					formTrigger:
						'w-full min-h-[38px] py-[6px] px-[10px] border border-[var(--ui-border)] rounded-[var(--ui-radius)] bg-[var(--ui-bg)] ring-0 transition-[border-color_0.15s_ease] hover:border-[var(--ui-border-hover,var(--color-primary-400))]',
				},
			},
		},

		toast: {
			variants: {
				color: toastFilledColorVariants,
			},
		},

		// table
		table: {
			slots: {
				tr: 'cursor-pointer',
			},
		},

		// calendar — no hover tint; no range-selection preview (data-highlighted) while picking end date
		// (Reka RangeCalendar sets data-highlighted from highlightedRange; theme uses data-[highlighted]:bg-*/20)
		calendar: {
			slots: {
				cellTrigger:
					'hover:not-data-[selected]:!bg-transparent data-[highlighted]:not-data-[selected]:!bg-transparent',
			},
		},
	},
});
