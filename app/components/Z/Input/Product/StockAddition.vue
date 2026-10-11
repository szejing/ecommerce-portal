<template>
  <div class="flex flex-wrap items-center gap-3 text-sm">
    <span v-if="summary">Reserved: {{ summary.reserved_quantity }}</span>
    <UTooltip text="Stock receipts and returned goods"><UButton icon="i-lucide-package-plus" color="neutral" variant="outline" aria-label="Add stock" @click="openModal" /></UTooltip>
    <UModal v-model:open="open" title="Add stock">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Reason"><USelect v-model="reason" :items="reasons" class="w-full" /></UFormField>
          <UFormField label="Quantity received"><UInput v-model.number="quantity" type="number" :min="1" step="1" /></UFormField>
          <UFormField v-if="reason === 'returned_goods'" label="Original order number"><UInput v-model="orderNo" /></UFormField>
          <p v-if="errorMessage" class="text-error" role="alert">{{ errorMessage }}</p>
          <UButton icon="i-lucide-check" label="Add stock" :loading="saving" :disabled="!valid" @click="save" />
        </div>
        <div v-if="summary?.movements.length" class="mt-6 overflow-x-auto">
          <table class="w-full text-sm">
            <thead><tr class="border-b text-left"><th class="py-2">Movement</th><th>Change</th><th>Balance</th></tr></thead>
            <tbody><tr v-for="movement in summary.movements" :key="movement.id" class="border-b">
              <td class="py-2">{{ movement.reason.replaceAll('_', ' ') }}<span v-if="movement.order_no" class="block text-muted">#{{ movement.order_no }}</span></td>
              <td>{{ movement.quantity_delta > 0 ? '+' : '' }}{{ movement.quantity_delta }}</td><td>{{ movement.balance_after }}</td>
            </tr></tbody>
          </table>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { StockSummary } from '~/repository/modules/product/product';
import { getErrorResponseMessage } from 'yeppi-common';

const props = withDefaults(defineProps<{ productCode: string; variantCode?: string }>(), { variantCode: '' });
const emit = defineEmits<{ received: [quantity: number] }>();
const { $api } = useNuxtApp();
const summary = ref<StockSummary>();
const open = ref(false);
const saving = ref(false);
const quantity = ref(1);
const reason = ref<'stock_receipt' | 'returned_goods'>('stock_receipt');
const reasons = [{ label: 'Stock receipt', value: 'stock_receipt' }, { label: 'Returned goods', value: 'returned_goods' }];
const orderNo = ref('');
const operationKey = ref('');
const errorMessage = ref('');
const valid = computed(() => Number.isSafeInteger(quantity.value) && quantity.value > 0 && (reason.value !== 'returned_goods' || !!orderNo.value.trim()));

async function load() {
  try { summary.value = await $api.product.stockSummary(props.productCode, props.variantCode); }
  catch (error) { errorMessage.value = getErrorResponseMessage(error, 'Unable to load stock'); }
}
function openModal() { operationKey.value = crypto.randomUUID(); errorMessage.value = ''; open.value = true; void load(); }
async function save() {
  if (!valid.value || saving.value) return;
  saving.value = true;
  errorMessage.value = '';
  try {
    summary.value = await $api.product.addStock(props.productCode, { variant_code: props.variantCode, quantity: quantity.value, reason: reason.value,
      operation_key: operationKey.value, ...(reason.value === 'returned_goods' ? { order_no: orderNo.value.trim() } : {}) });
    emit('received', summary.value.available_quantity);
    open.value = false;
  } catch (error) { errorMessage.value = getErrorResponseMessage(error, 'Unable to add stock'); }
  finally { saving.value = false; }
}
onMounted(load);
</script>
