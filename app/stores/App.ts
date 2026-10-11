import { defineStore } from 'pinia';

export const useAppStore = defineStore('appStore', {
	state: () => ({}),
	actions: {
		async init() {
			// const productOptionsStore = useProductOptionStore();
			const productTagsStore = useProductTagStore();
			const categoryStore = useProductCategoryStore();
			const brandStore = useBrandStore();
			// const productStore = useProductStore();
			const merchantInfo = useMerchantInfoStore();
			const settingsStore = useSettingStore();
			const productTypeStore = useProductTypeStore();
			// const orderStore = useOrderStore();
			const paymentTypeStore = usePaymentTypeStore();
			const paymentMethodStore = usePaymentMethodStore();
			const summOrderStore = useSummOrderStore();
			const summSalesStore = useSummSaleStore();
			// const customerStore = useCustomerStore();
			const notificationStore = useNotificationStore();

			// const outletStore = useOutletStore();
			// const taxStore = useTaxStore();
			// const taxGroupStore = useTaxGroupStore();
			// const taxRuleStore = useTaxRuleStore();
			await merchantInfo.getMerchantInfos();

			await Promise.all([
				// productOptionsStore.getProductVariations(),
				productTagsStore.getTags(),
				categoryStore.getCategoriesForTree(),
				brandStore.getBrands(),
				merchantInfo.getCurrencies(),
				settingsStore.getSettings(),
				productTypeStore.getProductTypes(),
				paymentTypeStore.getPaymentTypeGroups(),
				paymentMethodStore.getPaymentMethods(),
				summOrderStore.getDashboardSummary(),
				summSalesStore.getDashboardSummary(),
				notificationStore.getNotifications(),
				// customerStore.getCustomers(),
				// productStore.getProducts(),
				// outletStore.getOutlets(),
				// taxStore.getTaxes(),
				// taxGroupStore.getTaxGroups(),
				// taxRuleStore.getTaxRules(),
			]);
		},
	},
});
