import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { OrderStatus } from 'yeppi-common';
import ReportMobileControls from '~/components/Z/Analytics/ReportMobileControls.vue';
import { useAnalyticsReportControls, type AnalyticsReportFilters } from '~/composables/useAnalyticsReportControls';

describe('Analytics mobile controls', () => {
	it('stages filters, refreshes once on apply, and keeps display options and export reachable', async () => {
		const media = vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener() {},
			removeListener() {},
			addEventListener() {},
			removeEventListener() {},
			dispatchEvent: () => true,
		}));
		const report = ref({
			filter: { date_range: { start: new Date(2026, 10, 1), end: new Date(2026, 10, 30) } } as AnalyticsReportFilters,
			page_size: 15,
			current_page: 4,
		});
		const refresh = vi.fn().mockResolvedValue(undefined);
		const exportCsv = vi.fn();
		const total = ref(0);
		const selectedColumns = ref(['net_amt', 'total_qty']);
		const TestPage = defineComponent({
			setup() {
				const controls = useAnalyticsReportControls(report, refresh);
				controls.filtersOpen.value = true;
				return () => h(ReportMobileControls, {
					'filters': report.value.filter,
					'fields': ['status'],
					'filtersOpen': controls.filtersOpen.value,
					'onUpdate:filtersOpen': (open) => { controls.filtersOpen.value = open; },
					'pageSize': report.value.page_size,
					'columnOptions': [{ key: 'net_amt', label: 'Net amount' }, { key: 'total_qty', label: 'Quantity' }],
					'selectedColumnKeys': selectedColumns.value,
					'onUpdate:selectedColumnKeys': (keys) => { selectedColumns.value = keys; },
					'loading': false,
					'exporting': false,
					'total': total.value,
					'onApplyFilters': controls.applyMobileFilters,
					'onUpdate:pageSize': controls.setMobilePageSize,
					'onExport': exportCsv,
				});
			},
		});

		try {
			const wrapper = await mountSuspended(TestPage, {
				global: {
					stubs: {
						UDrawer: { template: '<section><slot /><slot name="body" /><slot name="footer" /></section>' },
						ZDateRange: true,
					},
				},
			});
			try {
				const select = (value: string | number) => {
					const control = wrapper.findAllComponents({ name: 'USelect' }).find((component) => component.props('modelValue') === value);
					if (!control) throw new Error(`Missing select with value ${value}`);
					return control;
				};
				const button = (label: string) => wrapper.findAll('button').find((component) => component.text() === label);

				select('All').vm.$emit('update:modelValue', OrderStatus.COMPLETED);
				expect(report.value.filter.status).toBeUndefined();
				expect(refresh).not.toHaveBeenCalled();
				await button('Apply filters')?.trigger('click');
				expect(report.value.filter.status).toBe(OrderStatus.COMPLETED);
				expect(report.value.current_page).toBe(1);
				expect(refresh).toHaveBeenCalledOnce();
				expect(wrapper.text()).toContain('Completed');

				select(15).vm.$emit('update:modelValue', 30);
				expect(report.value.page_size).toBe(30);
				expect(refresh).toHaveBeenCalledTimes(2);
				expect(wrapper.text()).toContain('Visible fields');
				expect(button('Export CSV')?.attributes('disabled')).toBeDefined();
				total.value = 50;
				await wrapper.vm.$nextTick();
				await button('Export CSV')?.trigger('click');
				expect(exportCsv).toHaveBeenCalledOnce();
			} finally {
				wrapper.unmount();
			}
		} finally {
			media.mockRestore();
		}
	});
});
