<template>
	<ZPagePanel id="products-tags" :title="t('nav.tags')" back-to="/products">
		<template #navbar-right>
			<ZCreateButton to="/products/tags/create" :label="t('common.addTag')" />
		</template>
		<template #toolbar>
			<ZSectionFilterTags />
		</template>
		<div class="space-y-6">
			<ZTableToolbar
				v-model="filter.page_size"
				v-model:selected-column-keys="selectedColumnKeys"
				:page-size-options="options_page_size"
				:export-enabled="true"
				:exporting="exporting"
				:column-options="columnOptions"
				@update:model-value="tagsStore.updatePage"
				@export="exportTags"
			/>

			<template v-if="initialize">
				<div class="rounded-lg overflow-hidden divide-y divide-neutral-200 dark:divide-neutral-700">
					<div class="grid grid-cols-[1fr_auto] gap-4 p-4">
						<USkeleton class="h-4 w-24" />
						<USkeleton class="h-4 w-16" />
					</div>
					<div v-for="i in 5" :key="i" class="grid grid-cols-[1fr_auto] gap-4 p-4 items-center">
						<USkeleton class="h-4 w-40" />
						<USkeleton class="h-4 w-12" />
					</div>
				</div>
			</template>

			<UCard v-else :ui="{ body: 'p-0 sm:p-0' }">
				<UTable :data="getDisplayTags" :columns="visibleColumns" :loading="loading" @select="selectTag">
					<template #empty>
						<div class="flex flex-col items-center justify-center py-12 gap-3">
							<UIcon :name="ICONS.ADDITIONAL" class="w-12 h-12 text-gray-400" />
							<p class="text-sm text-gray-600 dark:text-gray-400">{{ t('pages.noTagsFound') }}</p>
							<p class="text-xs text-gray-500 dark:text-gray-500">{{ t('pages.tryAdjustingFilters') }}</p>
						</div>
					</template>
				</UTable>
			</UCard>

			<!-- Pagination  -->
			<div v-if="!initialize && getDisplayTags.length > 0" class="section-pagination">
				<UPagination v-model="filter.current_page" :items-per-page="filter.page_size" :total="total_tags" @update:page="updatePage" />
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { ZModalConfirmation, ZModalTagDetail } from '#components';
import { getTagColumns } from '~/utils/table-columns';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import type { Tag } from '~/utils/types/tag';
import { options_page_size } from '~/utils/options';
import type { TableRow } from '@nuxt/ui';
import { failedNotification } from '~/stores/AppUi/AppUi';
import { ICONS } from '~/utils/icons';

const overlay = useOverlay();
const tagsStore = useProductTagStore();

const TAG_COLUMN_LABELS = {
	value: 'table.description',
	total_products: 'table.noOfItems',
} as const;

const { t } = useI18n();
const tag_columns = computed(() => getTagColumns(t));
const columnOptions = computed(() => columnOptionsFromLabelMap(t, TAG_COLUMN_LABELS));
const { selectedColumnKeys, visibleColumns } = useTableColumnVisibility(tag_columns, columnOptions);
useHead({ title: () => t('pages.tagsTitle') });

const { loading, getDisplayTags, total_tags, filter, exporting } = storeToRefs(tagsStore);
const initialize = ref(true);

onMounted(async () => {
	initialize.value = true;
	try {
		await tagsStore.getTags();
	} finally {
		initialize.value = false;
	}
});

const deleteTag = async (row: TableRow<Tag>) => {
	const tag = row.original;

	const hasProducts = tag?.total_products && tag.total_products > 0;

	const confirmModal = overlay.create(ZModalConfirmation, {
		props: {
			message: hasProducts ? t('pages.confirmDeleteTagWithProducts') : t('pages.confirmDeleteTag'),
			action: 'delete',
			onConfirm: async () => {
				await tagsStore.deleteTag(tag);
				confirmModal.close();
			},
			onCancel: () => {
				confirmModal.close();
			},
		},
	});

	confirmModal.open();
};

const selectTag = async (e: Event, row: TableRow<Tag>) => {
	const tag = row.original;
	if (!tag) return;

	if (tag.is_internal) {
		failedNotification(t('pages.internalTagsCannotBeEdited'));
		return;
	}

	const tagModal = overlay.create(ZModalTagDetail, {
		props: {
			tag: JSON.parse(JSON.stringify(tag)),
			onUpdate: async (tag: Tag) => {
				await tagsStore.updateTag(tag.id, tag);
				tagModal.close();
			},
			onDelete: async () => {
				tagModal.close();
				await deleteTag(row);
			},
			onCancel: () => {
				tagModal.close();
			},
		},
	});

	tagModal.open();
};

const updatePage = async (page: number) => {
	await tagsStore.updatePage(page);
};

const exportTags = async () => {
	// await tagsStore.exportTags();
};
</script>

<style scoped>
.base {
	width: 100%;
	display: grid;
	grid-template-columns: repeat(1, minmax(0, 1fr));
	gap: 1.5rem;
	margin-top: 1rem;
}

@media (min-width: 640px) {
	.base {
		grid-template-columns: repeat(6, minmax(0, 1fr));
	}
}

.section-empty {
	height: 13rem;
}

.section-empty div {
	text-align: center;
}

.section-empty h2 {
	font-size: 1.5rem;
	line-height: 2rem;
	font-weight: 600;
}

.section-empty p {
	color: var(--color-neutral-400);
}
</style>
