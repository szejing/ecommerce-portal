import { defineStore } from 'pinia';
import { format, sub } from 'date-fns';
import type { BaseODataReq } from '~/repository/base/base.req';
import type { ErrorResponse } from 'yeppi-common';
import { options_page_size } from '~/utils/options';
import type {
	ActivityLog,
	ActivityLogAction,
	ActivityLogActorType,
	ActivityLogSource,
	ActivityLogVisibility,
} from '~/utils/types/activity-log';
import type { Range } from '~/utils/interface';

export const ACTIVITY_LOG_FILTER_DEBOUNCE_MS = 500;

export type ActivityLogFailure = { kind: 'request_failed'; message: string };
export type ActivityLogRefreshOutcome =
	| { status: 'completed' }
	| { status: 'stale' }
	| { status: 'failed'; failure: ActivityLogFailure };

type ActivityLogFilter = {
	query: string;
	action: ActivityLogAction | undefined;
	actor_type: ActivityLogActorType | undefined;
	source: ActivityLogSource | undefined;
	visibility: ActivityLogVisibility | undefined;
	date_range: Range;
	page_size: number;
	current_page: number;
};

const initialEmptyFilter = (): ActivityLogFilter => ({
	query: '',
	action: undefined,
	actor_type: undefined,
	source: undefined,
	visibility: undefined,
	date_range: {
		start: sub(new Date(), { days: 30 }),
		end: new Date(),
	},
	page_size: options_page_size[0] as number,
	current_page: 1,
});

const formatFilterDate = (date: Date, endOfDay = false) => `${format(date, 'yyyy-MM-dd')}T${endOfDay ? '23:59:59' : '00:00:00'}`;
const quote = (value: string) => `'${value.replace(/'/g, "''")}'`;

let activityLogFilterTimer: ReturnType<typeof setTimeout> | undefined;

export const useActivityLogStore = defineStore('activityLogStore', {
	state: () => ({
		loading: false as boolean,
		exporting: false as boolean,
		activity_logs: [] as ActivityLog[],
		total_activity_logs: 0 as number,
		filter: initialEmptyFilter(),
		listFailure: undefined as ActivityLogFailure | undefined,
		listingGeneration: 0 as number,
	}),
	getters: {
		filters: (state) => ({
			...state.filter,
			date_range: { ...state.filter.date_range },
		}),
	},
	actions: {
		buildFilter(): string {
			const clauses: string[] = [];
			if (this.filter.action) clauses.push(`action eq ${quote(this.filter.action)}`);
			if (this.filter.actor_type) clauses.push(`actor_type eq ${quote(this.filter.actor_type)}`);
			if (this.filter.source) clauses.push(`source eq ${quote(this.filter.source)}`);
			if (this.filter.visibility) clauses.push(`visibility eq ${quote(this.filter.visibility)}`);
			const { start, end } = this.filter.date_range;
			if (start || end) {
				const startDate = start ?? end ?? new Date();
				const endDate = end ?? startDate;
				clauses.push(`created_at between ${quote(formatFilterDate(startDate))} and ${quote(formatFilterDate(endDate, true))}`);
			}
			return clauses.join(' and ');
		},

		setSearch(search: string) {
			this.filter.query = search;
			this.filter.current_page = 1;
			if (activityLogFilterTimer) clearTimeout(activityLogFilterTimer);
			activityLogFilterTimer = setTimeout(() => {
				activityLogFilterTimer = undefined;
				void this.refreshListing();
			}, ACTIVITY_LOG_FILTER_DEBOUNCE_MS);
		},

		async setDateRange(range: Range): Promise<ActivityLogRefreshOutcome> {
			this.filter.date_range = { start: range.start, end: range.end };
			this.filter.current_page = 1;
			return this.refreshListing();
		},

		async setAction(action: ActivityLogAction | undefined): Promise<ActivityLogRefreshOutcome> {
			this.filter.action = action;
			this.filter.current_page = 1;
			return this.refreshListing();
		},

		async setActorType(actorType: ActivityLogActorType | undefined): Promise<ActivityLogRefreshOutcome> {
			this.filter.actor_type = actorType;
			this.filter.current_page = 1;
			return this.refreshListing();
		},

		async setSource(source: ActivityLogSource | undefined): Promise<ActivityLogRefreshOutcome> {
			this.filter.source = source;
			this.filter.current_page = 1;
			return this.refreshListing();
		},

		async setVisibility(visibility: ActivityLogVisibility | undefined): Promise<ActivityLogRefreshOutcome> {
			this.filter.visibility = visibility;
			this.filter.current_page = 1;
			return this.refreshListing();
		},

		async setPage(page: number): Promise<ActivityLogRefreshOutcome> {
			this.filter.current_page = page;
			return this.refreshListing();
		},

		async setPageSize(size: number): Promise<ActivityLogRefreshOutcome> {
			this.filter.page_size = size;
			this.filter.current_page = 1;
			return this.refreshListing();
		},

		async clearFilters(): Promise<ActivityLogRefreshOutcome> {
			if (activityLogFilterTimer) clearTimeout(activityLogFilterTimer);
			activityLogFilterTimer = undefined;
			this.filter = initialEmptyFilter();
			return this.refreshListing();
		},

		resetFilters() {
			if (activityLogFilterTimer) clearTimeout(activityLogFilterTimer);
			activityLogFilterTimer = undefined;
			this.filter = initialEmptyFilter();
		},

		async updatePageSize(size: number) {
			await this.setPageSize(size);
		},

		async updatePage(page: number) {
			await this.setPage(page);
		},

		async getActivityLogs(): Promise<ActivityLogRefreshOutcome> {
			return this.refreshListing();
		},

		async refreshListing(): Promise<ActivityLogRefreshOutcome> {
			const generation = ++this.listingGeneration;
			this.loading = true;
			this.listFailure = undefined;
			const { $api } = useNuxtApp();
			try {
				const filter = this.buildFilter();
				const queryParams: BaseODataReq = {
					$top: this.filter.page_size,
					$count: true,
					$skip: (this.filter.current_page - 1) * this.filter.page_size,
					$orderby: 'created_at desc',
				};
				if (filter) queryParams.$filter = filter;
				const search = this.filter.query.trim().replace(/^#+/, '');
				if (search) queryParams.$search = search;
				const { data, '@odata.count': total } = await $api.activityLog.getMany(queryParams);
				if (generation !== this.listingGeneration) return { status: 'stale' };
				this.activity_logs = data ?? [];
				this.total_activity_logs = total ?? 0;
				return { status: 'completed' };
			} catch (err: unknown | ErrorResponse) {
				if (generation !== this.listingGeneration) return { status: 'stale' };
				const failure = { kind: 'request_failed' as const, message: (err as ErrorResponse).message ?? 'Failed to load activity logs' };
				this.listFailure = failure;
				return { status: 'failed', failure };
			} finally {
				if (generation === this.listingGeneration) this.loading = false;
			}
		},
	},
});
