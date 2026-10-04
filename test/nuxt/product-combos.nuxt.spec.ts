import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { useNuxtApp, useRouter } from '#imports';
import { ProductStatus, ProductType } from 'yeppi-common';
import { USelect } from '#components';
import ComboListing from '~/pages/products/combos/index.vue';
import CreatePage from '~/components/Form/Product/CreatePage.vue';
import DetailPage from '~/components/Form/Product/DetailPage.vue';
import BasicInfo from '~/components/Z/Input/Product/BasicInfoSection.vue';
import ComboComponents from '~/components/Z/Input/Product/ComboComponents.vue';
import { useProductStore } from '~/stores/Product/Product';
import { useProductTypeStore } from '~/stores/ProductType/ProductType';
import { useAppUiStore } from '~/stores/AppUi/AppUi';

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
mockNuxtImport('navigateTo', () => navigate);
mockNuxtImport('useRoute', () => () => ({ params: { slug: 'meal' } }));
mockNuxtImport('useLeavePageGuard', () => () => undefined);

const pageStub = { template: '<main><slot name="navbar-right" /><slot name="toolbar" /><slot /><slot name="footer" /></main>' };
const combo = { code: 'MEAL', slug: 'meal', name: 'Burger meal', type: ProductType.ITEM, composition: 'fixed_combo' as const, status: ProductStatus.PUBLISHED, is_active: true, thumbnail: { id: 1, url: '/meal.webp' }, combo_available_quantity: 4, combo_components: [{ product_code: 'COKE', quantity: 2 }], combo_component_details: [{ product_code: 'COKE', product_name: 'Coke', quantity: 2 }], price_types: [{ id: 1, currency_code: 'MYR', orig_sell_price: 12 }], updated_at: new Date() };

describe('portal combo workspace', () => {
  beforeEach(() => {
    useProductStore().$reset();
    useProductTypeStore().prod_types = [{ id: 1, value: ProductType.ITEM }] as any;
    navigate.mockClear();
  });
  afterEach(() => vi.restoreAllMocks());

  it('registers listing/create/detail routes and the sidebar entry', () => {
    const router = useRouter();
    expect(router.resolve('/products/combos').name).toBe('products-combos');
    expect(router.resolve('/products/combos/create').name).toBe('products-combos-create');
    expect(router.resolve('/products/combos/meal').name).toBe('products-combos-slug');
    expect(useAppUiStore().navigations.flatMap(group => group.links).find(link => link.to === '/products')?.children).toContainEqual(expect.objectContaining({ to: '/products/combos' }));
  });

  it('renders existing combo thumbnails, contents, availability and configuration links', async () => {
    const getMany = vi.spyOn(useNuxtApp().$api.product, 'getMany').mockResolvedValue({ data: [combo], value: [combo], count: 1, '@odata.count': 1 });
    const wrapper = await mountSuspended(ComboListing, { global: { stubs: { ZPagePanel: pageStub, UTooltip: { template: '<span><slot /></span>' } } } });
    expect(getMany).toHaveBeenCalledWith(expect.objectContaining({ $filter: "composition eq 'fixed_combo'" }));
    expect(wrapper.text()).toContain('Burger meal');
    expect(wrapper.text()).toContain('2 x Coke');
    expect(wrapper.find('img[src="/meal.webp"]').exists()).toBe(true);
    expect(wrapper.find('a[href="/products/combos/meal"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it('initializes dedicated creation with fixed-combo mode and returns to the combo listing', async () => {
    const wrapper = await mountSuspended(CreatePage, { props: { comboOnly: true }, global: { stubs: { ZPagePanel: pageStub, FormProductCreation: { name: 'FormProductCreation', props: ['comboOnly', 'returnTo'], template: '<div />' } } } });
    expect(useProductStore().new_product.composition).toBe('fixed_combo');
    expect(wrapper.findComponent({ name: 'FormProductCreation' }).props()).toMatchObject({ comboOnly: true, returnTo: '/products/combos' });
    wrapper.unmount();
  });

  it('keeps thumbnail/gallery uploaders but hides composition/type switches and parent inventory', async () => {
    const wrapper = await mountSuspended(BasicInfo, {
      props: { comboOnly: true, showInventory: true, state: { composition: 'fixed_combo', type_id: 1, combo_components: [], name: 'Meal' } },
      global: { stubs: { UTooltip: { template: '<span><slot /></span>' }, ZDropzone: { template: '<div data-test="image-upload" />' }, ZInputProductComboComponents: true, ZInputProductLongDescriptionEditor: true } },
    });
    expect(wrapper.findAll('[data-test="image-upload"]')).toHaveLength(2);
    expect(wrapper.findComponent({ name: 'ZSelectMenuProductType' }).exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Manage Inventory');
    wrapper.unmount();
  });

  it('does not edit an ordinary product through the combo configuration route', async () => {
    vi.spyOn(useNuxtApp().$api.product, 'getSingleBySlug').mockResolvedValue({ product: { ...combo, composition: 'single' } });
    const wrapper = await mountSuspended(DetailPage, { props: { comboOnly: true }, global: { stubs: { ZPagePanel: pageStub, FormProductUpdate: true, FormProductUpdateLoading: true } } });
    expect(useProductStore().current_product).toBeUndefined();
    expect(navigate).toHaveBeenCalledWith('/products/combos');
    wrapper.unmount();
  });

  it('keeps ingredient configuration visible while product types are loading', async () => {
    useProductTypeStore().prod_types = [];
    const wrapper = await mountSuspended(BasicInfo, {
      props: { comboOnly: true, state: { composition: 'fixed_combo', type_id: 1, combo_components: [], name: 'Meal' } },
      global: { stubs: { UTooltip: { template: '<span><slot /></span>' }, ZDropzone: true, ZInputProductComboComponents: { template: '<div data-test="combo-components" />' }, ZInputProductLongDescriptionEditor: true } },
    });
    expect(wrapper.find('[data-test="combo-components"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it('uses a nonempty all-categories option when configuring ingredients', async () => {
    const wrapper = await mountSuspended(ComboComponents, {
      props: { modelValue: [] },
      global: { stubs: { UModal: { template: '<section><slot name="body" /><slot name="footer" /></section>' } } },
    });
    expect(wrapper.findComponent(USelect).props()).toMatchObject({ items: [{ label: 'All categories', value: 'all' }] });
    wrapper.unmount();
  });
});
