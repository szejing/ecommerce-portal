import { defineStore } from 'pinia';
import { options_page_size } from '~/utils/options';
import type { TagCreate } from '~/utils/types/form/tag-creation';
import type { Tag } from '~/utils/types/tag';
import { failedNotification, successNotification } from '../AppUi/AppUi';
import type { ErrorResponse } from 'yeppi-common';
import type { BaseODataReq } from '~/repository/base/base.req';

type TagFilter = {
	query: string;
	page_size: number;
	current_page: number;
};

const initialEmptyTag: TagCreate = {
	value: undefined,
};

const initialEmptyTagFilter: TagFilter = {
	query: '',
	page_size: options_page_size[0] as number,
	current_page: 1,
};

export const useProductTagStore = defineStore('productTagStore', {
	state: () => ({
		loading: false as boolean,
		adding: false as boolean,
		updating: false as boolean,
		exporting: false as boolean,
		tags: [] as Tag[],
		total_tags: 0 as number,
		new_tag: structuredClone(initialEmptyTag),
		filter: initialEmptyTagFilter,
		errors: [] as string[],
	}),
	getters: {
		getDisplayTags: (state) => state.tags.filter((tag) => tag.is_internal === false),
	},
	actions: {
		resetNewTag() {
			this.new_tag = structuredClone(initialEmptyTag);
		},

		async updatePageSize(size: number) {
			this.filter.page_size = size;

			if (this.filter.page_size > this.tags.length) {
				this.filter.current_page = 1;
				return;
			}

			this.getTags();
		},

		async updatePage(page: number) {
			this.filter.current_page = page;

			if (this.filter.current_page < 0 || this.tags.length === this.total_tags) {
				return;
			}

			this.getTags();
		},

		async fetchTags(append = false) {
			const { $api } = useNuxtApp();

			try {
				const queryParams: BaseODataReq = {
					$top: this.filter.page_size,
					$count: true,
					$expand: 'products',
					$skip: (this.filter.current_page - 1) * this.filter.page_size,
					$orderby: 'updated_at desc',
				};

				if (this.filter.query) {
					queryParams.$search = this.filter.query;
				}

				const { data, '@odata.count': total } = await $api.tag.getMany(queryParams);

				if (data) {
					this.tags = append ? [...this.tags, ...data] : data;
					this.total_tags = total ?? 0;
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process product tag';
				failedNotification(message);
			}
		},

		async getTags() {
			this.loading = true;

			try {
				await this.fetchTags(false);
			} finally {
				this.loading = false;
			}
		},

		async loadMoreTags() {
			if (this.loading || this.tags.length >= this.total_tags) return;

			this.loading = true;
			this.filter.current_page += 1;

			try {
				await this.fetchTags(true);
			} finally {
				this.loading = false;
			}
		},

		async addTag(value: string): Promise<Tag> {
			if (value.trim() === '') {
				failedNotification('Tag value is required');
				throw new Error('Tag value is required');
			}

			this.adding = true;
			this.loading = true;

			const { $api } = useNuxtApp();

			try {
				const data = await $api.tag.create({ value });

				if (data.tag) {
					successNotification(`${value} - Tag Created !`);
					this.tags.push(data.tag);
				}
				this.resetNewTag();
				return data.tag;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process product tag';
				failedNotification(message);
				throw new Error(message);
			} finally {
				this.adding = false;
				this.loading = false;
			}
		},

		async updateTag(id: number, tag: Tag) {
			this.updating = true;

			const { $api } = useNuxtApp();

			try {
				const data = await $api.tag.update(id, {
					value: tag.value,
				});

				if (data.tag) {
					successNotification(`Tag Updated !`);
					this.getTags();
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process product tag';
				failedNotification(message);
			} finally {
				this.updating = false;
			}
		},

		async deleteTag(tag: Tag) {
			this.loading = true;

			const { $api } = useNuxtApp();

			try {
				await $api.tag.delete({ id: tag.id });
				successNotification(`Tag #${tag.value} Deleted !`);

				const index = this.tags.findIndex((t) => t.id === tag.id);
				this.tags.splice(index, 1);
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process product tag';
				failedNotification(message);
			} finally {
				this.loading = false;
			}
		},
	},
});
