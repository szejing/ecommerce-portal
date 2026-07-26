<template>
	<UModal :title="t('components.zModal.updateTag')" :ui="{ content: 'w-full sm:max-w-[60%] md:max-w-[40%] lg:max-w-[30%]' }">
		<template #body>
			<UForm ref="form" :schema="tagSchema" :state="state.tag" class="space-y-4" @submit="onSubmit">
				<ZInputProductTagGeneralInfo v-model:value="state.tag.value" />
			</UForm>
		</template>

		<template #footer>
			<div class="flex-jbetween-icenter w-full">
				<UButton color="error" variant="ghost" class="opacity-50 hover:opacity-100" @click="onDelete">{{ t('components.zModal.delete') }}</UButton>

				<div class="flex-jend gap-4">
					<UButton color="neutral" variant="soft" @click="onCancel">{{ t('common.cancel') }}</UButton>
					<UButton color="primary" variant="solid" :loading="updating" @click="form.submit()">{{ t('components.zModal.update') }}</UButton>
				</div>
			</div>
		</template>
	</UModal>
</template>

<script lang="ts" setup>
import type { FormSubmitEvent } from '#ui/types';
import type { z } from 'zod';
import { UpdateTagValidation } from '~/utils/schema';
import type { Tag } from '~/utils/types/tag';

const { t } = useI18n();
const tagSchema = computed(() => UpdateTagValidation(t));

type Schema = z.infer<ReturnType<typeof UpdateTagValidation>>;

const props = defineProps({
	tag: {
		type: Object as PropType<Tag> | undefined,
		required: true,
	},
});
const emit = defineEmits(['update', 'delete', 'cancel']);

const form = ref();

const state = reactive({
	tag: props.tag,
});

const tagStore = useProductTagStore();
const { updating } = storeToRefs(tagStore);

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
	const { value } = event.data;

	if (value === '' || value === undefined) {
		return;
	}

	emit('update', state.tag);
};

const onDelete = () => {
	emit('delete');
};

const onCancel = () => {
	emit('cancel');
};
</script>

<style scoped></style>
