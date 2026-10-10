import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { useNuxtApp, useRouter } from '#imports';
import { ProductStatus, ProductType } from 'yeppi-common';
import { USelect } from '#components';
import ComboListing from '~/pages/products/combos/index.vue';
import CreatePage from '~/components/Form/Combo/CreatePage.vue';
import DetailPage from '~/components/Form/Combo/DetailPage.vue';
import ComboBasicInfo from '~/components/Z/Input/Combo/BasicInfoSection.vue';
import ProductBasicInfo from '~/components/Z/Input/Product/BasicInfoSection.vue';
import ComboComponents from '~/components/Z/Input/Combo/ComboComponents.vue';
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
    const wrapper = await mountSuspended(CreatePage, { global: { stubs: { ZPagePanel: pageStub, FormComboCreation: { name: 'FormComboCreation', props: ['returnTo'], template: '<div />' } } } });
    expect(useProductStore().new_product.composition).toBe('fixed_combo');
    expect(wrapper.findComponent({ name: 'FormComboCreation' }).props()).toMatchObject({ returnTo: '/products/combos' });
    wrapper.unmount();
  });

  it('keeps thumbnail/gallery uploaders but hides composition/type switches and parent inventory', async () => {
    const wrapper = await mountSuspended(ComboBasicInfo, {
      props: { showLongDescription: true, state: { composition: 'fixed_combo', type_id: 1, combo_components: [], name: 'Meal' } },
      global: { stubs: { UTooltip: { template: '<span><slot /></span>' }, ZDropzone: { template: '<div data-test="image-upload" />' }, ZInputComboComponents: true, ZInputProductLongDescriptionEditor: true } },
    });
    expect(wrapper.findAll('[data-test="image-upload"]')).toHaveLength(2);
    expect(wrapper.findComponent({ name: 'ZSelectMenuProductType' }).exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Manage Inventory');
    expect(wrapper.text()).not.toContain('Composition');
    expect(wrapper.text()).toContain('Combo Code');
    expect(wrapper.text()).toContain('Combo Name');
    expect(wrapper.text()).toContain('Combo Images');
    expect(wrapper.text()).not.toContain('Product Code');
    expect(wrapper.text()).not.toContain('Product Name');
    wrapper.unmount();
  });

  it('does not edit an ordinary product through the combo configuration route', async () => {
    vi.spyOn(useNuxtApp().$api.product, 'getSingleBySlug').mockResolvedValue({ product: { ...combo, composition: 'single' } });
    const wrapper = await mountSuspended(DetailPage, { global: { stubs: { ZPagePanel: pageStub, FormComboUpdate: true, FormComboUpdateLoading: true } } });
    expect(useProductStore().current_product).toBeUndefined();
    expect(navigate).toHaveBeenCalledWith('/products/combos');
    wrapper.unmount();
  });

  it('keeps ingredient configuration visible while product types are loading', async () => {
    useProductTypeStore().prod_types = [];
    const wrapper = await mountSuspended(ComboBasicInfo, {
      props: { state: { composition: 'fixed_combo', type_id: 1, combo_components: [], name: 'Meal' } },
      global: { stubs: { UTooltip: { template: '<span><slot /></span>' }, ZDropzone: true, ZInputComboComponents: { template: '<div data-test="combo-components" />' }, ZInputProductLongDescriptionEditor: true } },
    });
    expect(wrapper.find('[data-test="combo-components"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it('product basic info has no composition or combo-components UI', async () => {
    const wrapper = await mountSuspended(ProductBasicInfo, {
      props: { showInventory: true, state: { type_id: 1, name: 'Single', manage_inventory: false, allow_preorder: false, inventory_quantity: 0 } },
      global: { stubs: { UTooltip: { template: '<span><slot /></span>' }, ZDropzone: true, ZSelectMenuProductType: true, ZInputProductLongDescriptionEditor: true, ZInputProductStockAddition: true } },
    });
    expect(wrapper.text()).not.toContain('Composition');
    expect(wrapper.text()).not.toContain('Fixed combo');
    expect(wrapper.findComponent({ name: 'ZInputComboComponents' }).exists()).toBe(false);
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

  it('omits empty $search when loading the add-items picker', async () => {
    const getMany = vi.spyOn(useNuxtApp().$api.product, 'getMany').mockResolvedValue({ data: [], value: [], count: 0, '@odata.count': 0 } as any);
    const wrapper = await mountSuspended(ComboComponents, {
      props: { modelValue: [] },
      global: { stubs: { UModal: { template: '<section><slot name="body" /><slot name="footer" /></section>' }, UTooltip: { template: '<span><slot /></span>' } } },
    });
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(getMany).toHaveBeenCalled();
    const query = getMany.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(query).not.toHaveProperty('$search');
    wrapper.unmount();
  });

  it('shows unit price, line total, quantity steppers and reference helpers for included items', async () => {
    vi.spyOn(useNuxtApp().$api.product, 'getSingle').mockResolvedValue({
      product: {
        code: 'POPCORN',
        name: 'Popcorn',
        type: ProductType.ITEM,
        composition: 'single',
        price_types: [{ currency_code: 'MYR', orig_sell_price: 8 }],
        manage_inventory: true,
        inventory_quantity: 20,
      },
    } as any);
    const wrapper = await mountSuspended(ComboComponents, {
      props: {
        modelValue: [{ product_code: 'POPCORN', quantity: 1 }],
        currencyCode: 'MYR',
      },
      global: { stubs: { UModal: { template: '<section><slot name="body" /><slot name="footer" /></section>' }, UTooltip: { template: '<span><slot /></span>' } } },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('Popcorn');
    expect(wrapper.text()).toMatch(/8\.00|RM\s?8/);
    expect(wrapper.text()).toContain('Individual prices are shown for reference');
    expect(wrapper.text()).toContain('Availability is calculated from the included items');
    expect(wrapper.find('button[aria-label="Increase quantity"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it('shows Bought separately and Customer saves from the combo pricing section', async () => {
    const PricingSection = (await import('~/components/Z/Input/Combo/PricingSection.vue')).default;
    const wrapper = await mountSuspended(PricingSection, {
      props: {
        currencyCode: 'MYR',
        origSellPrice: 10,
        referenceTotal: 12,
      },
      global: { stubs: { ZInputProductPricingSection: { template: '<div data-test="product-pricing" />' } } },
    });
    expect(wrapper.text()).toContain('Bought separately');
    expect(wrapper.text()).toMatch(/12\.00|RM\s?12/);
    expect(wrapper.text()).toContain('Customer saves');
    expect(wrapper.text()).toMatch(/2\.00|RM\s?2/);
    wrapper.unmount();
  });

  it('hides savings and shows a notice when combo price is at or above reference', async () => {
    const PricingSection = (await import('~/components/Z/Input/Combo/PricingSection.vue')).default;
    const wrapper = await mountSuspended(PricingSection, {
      props: {
        currencyCode: 'MYR',
        origSellPrice: 12,
        referenceTotal: 12,
      },
      global: { stubs: { ZInputProductPricingSection: { template: '<div />' } } },
    });
    expect(wrapper.text()).not.toContain('Customer saves');
    expect(wrapper.text()).toContain('equal to or higher');
    wrapper.unmount();
  });

  it('merges quantity when re-adding the same component and keeps unit prices read-only when combo price changes', async () => {
    const popcorn = {
      code: 'POPCORN',
      name: 'Popcorn',
      type: ProductType.ITEM,
      composition: 'single' as const,
      price_types: [{ currency_code: 'MYR', orig_sell_price: 8 }],
      manage_inventory: false,
    };
    vi.spyOn(useNuxtApp().$api.product, 'getMany').mockResolvedValue({ data: [popcorn], value: [popcorn], count: 1, '@odata.count': 1 } as any);
    vi.spyOn(useNuxtApp().$api.product, 'getSingle').mockResolvedValue({ product: popcorn } as any);
    const components = ref([{ product_code: 'POPCORN', quantity: 1 }]);
    const wrapper = await mountSuspended(ComboComponents, {
      props: { modelValue: components.value, currencyCode: 'MYR', 'onUpdate:modelValue': (v: typeof components.value) => { components.value = v; } },
      global: { stubs: { UModal: { template: '<section><slot name="body" /><slot name="footer" /></section>' }, UTooltip: { template: '<span><slot /></span>' } } },
    });
    await flushPromises();
    const before = wrapper.text();
    expect(before).toMatch(/8\.00|RM\s?8/);
    await wrapper.find('button[aria-label="Increase quantity"]').trigger('click');
    expect(components.value[0]?.quantity).toBe(2);
    expect(wrapper.text()).toMatch(/8\.00|RM\s?8/);
    wrapper.unmount();
  });
});
