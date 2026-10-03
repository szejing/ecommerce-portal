<template>
  <section class="space-y-3">
    <div class="flex items-center justify-between gap-3">
      <h3 class="text-base font-semibold">Components</h3>
      <UButton icon="i-lucide-plus" label="Add component" size="sm" @click="open = true" />
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm text-left">
        <thead><tr class="border-b"><th class="py-2">Product</th><th>Variant</th><th class="w-28">Required quantity</th><th class="w-10"></th></tr></thead>
        <tbody>
          <tr v-for="(component, index) in components" :key="`${component.product_code}:${component.variant_code ?? ''}`" class="border-b">
            <td class="py-3 pr-2">{{ names.get(component.product_code)?.name ?? component.product_code }}</td>
            <td class="pr-2">{{ names.get(component.product_code)?.variants?.find(v => v.variant_code === component.variant_code)?.name ?? component.variant_code ?? '-' }}</td>
            <td><UInput v-model.number="component.quantity" type="number" :min="1" step="1" class="w-24" aria-label="Required quantity" /></td>
            <td><UTooltip text="Remove component"><UButton icon="i-lucide-trash-2" color="error" variant="ghost" aria-label="Remove component" @click="components.splice(index, 1)" /></UTooltip></td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="text-sm text-muted">Available Quantity: {{ availability === null ? 'Unlimited' : availability }}</p>
    <UModal v-model:open="open" title="Add component">
      <template #body>
        <div class="space-y-4">
          <div class="flex flex-wrap gap-2">
            <UInput v-model="search" icon="i-lucide-search" placeholder="Search products" class="flex-1" />
            <USelect v-model="category" :items="categoryItems" placeholder="Category" class="w-44" />
          </div>
          <p v-if="error" class="text-sm text-error">{{ error }}</p>
          <div :aria-busy="loading" class="min-h-48 max-h-80 overflow-y-auto divide-y">
            <button v-for="product in choices" :key="product.code" type="button" class="flex w-full items-center gap-3 py-3 text-left hover:bg-muted" @click="selected = product; variantCode = undefined">
              <img v-if="product.thumbnail?.url" :src="product.thumbnail.url" :alt="product.name" class="size-10 rounded object-cover" />
              <span class="min-w-0 flex-1 break-words">{{ product.name }} <span class="text-muted">{{ product.code }}</span></span>
              <UIcon v-if="selected?.code === product.code" name="i-lucide-check" />
            </button>
            <p v-if="!loading && !choices.length" class="py-6 text-center text-muted">No matching products</p>
          </div>
          <div class="flex justify-between items-center">
            <UButton icon="i-lucide-chevron-left" variant="ghost" aria-label="Previous page" :disabled="page === 1 || loading" @click="page--" />
            <span class="text-sm">{{ page }}</span>
            <UButton icon="i-lucide-chevron-right" variant="ghost" aria-label="Next page" :disabled="page * 25 >= total || loading" @click="page++" />
          </div>
          <UFormField v-if="selected?.variants?.length" label="Exact variant" required>
            <USelect v-model="variantCode" :items="selected.variants.map(v => ({ label: v.name ?? v.variant_code, value: v.variant_code }))" class="w-full" />
          </UFormField>
        </div>
      </template>
      <template #footer><UButton label="Add component" icon="i-lucide-plus" :disabled="!selected || (!!selected.variants?.length && !variantCode)" @click="add" /></template>
    </UModal>
  </section>
</template>

<script setup lang="ts">
import { ProductType } from 'yeppi-common';
import type { Product, ComboComponent } from '~/utils/types/product';
const components = defineModel<ComboComponent[]>({ default: () => [] });
const props = defineProps<{ productCode?: string }>();
const { $api } = useNuxtApp();
const open = ref(false);
const search = ref('');
const category = ref('');
const page = ref(1);
const total = ref(0);
const products = ref<Product[]>([]);
const names = reactive(new Map<string, Product>());
const selected = ref<Product>();
const variantCode = ref<string>();
const loading = ref(false);
const error = ref('');
let generation = 0;
const categoryItems = computed(() => [{ label: 'All categories', value: '' }, ...Array.from(new Map([...names.values()].flatMap(p => p.categories ?? []).map(c => [c.code, { label: c.description ?? c.code ?? '', value: c.code ?? '' }])).values())]);
const choices = computed(() => products.value.filter(p => p.code !== props.productCode && p.is_active !== false && p.type === ProductType.ITEM && p.composition !== 'fixed_combo'));
const availability = computed(() => {
  if (!components.value.length) return 0;
  let limit: number | null = null;
  for (const component of components.value) {
    const product = names.get(component.product_code);
    if (!product) return 0;
    const grain = component.variant_code ? product.variants?.find(v => v.variant_code === component.variant_code) : product;
    if (!grain) return 0;
    if (grain.manage_inventory) limit = Math.min(limit ?? Infinity, Math.max(0, Math.floor((grain.inventory_quantity ?? 0) / component.quantity)));
  }
  return limit;
});
async function load() {
  const current = ++generation;
  loading.value = true;
  error.value = '';
  try {
    const response = await $api.product.getMany({ $top: 25, $skip: (page.value - 1) * 25, $count: true, $search: search.value.trim(), $expand: 'type,variants,thumbnail,categories', $filter: `is_active eq true${category.value ? ` and categories/code eq '${category.value.replaceAll("'", "''")}'` : ''}` });
    if (current !== generation) return;
    products.value = response.data ?? response.value ?? [];
    total.value = response['@odata.count'] ?? response.count ?? 0;
    for (const product of products.value) if (product.code) names.set(product.code, product);
  } catch (cause) { if (current === generation) error.value = cause instanceof Error ? cause.message : 'Unable to load components'; }
  finally { if (current === generation) loading.value = false; }
}
function add() {
  if (!selected.value?.code) return;
  const existing = components.value.find(c => c.product_code === selected.value!.code && (c.variant_code || '') === (variantCode.value || ''));
  if (existing) existing.quantity += 1;
  else components.value.push({ product_code: selected.value.code, variant_code: variantCode.value, quantity: 1 });
  selected.value = undefined; variantCode.value = undefined; open.value = false;
}
watch([search, category], () => { page.value = 1; });
watch([open, search, category, page], () => { if (open.value) void load(); });
onMounted(async () => {
  for (const code of new Set(components.value.map(c => c.product_code))) {
    try { const response = await $api.product.getSingle(code); if (response.product) names.set(code, response.product); }
    catch { error.value = 'One or more components are unavailable'; }
  }
});
</script>
