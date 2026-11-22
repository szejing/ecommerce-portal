import type { Ref } from 'vue';

export function useMobileListScroll(
	key: string,
	content: Readonly<Ref<HTMLElement | null>>,
	isRecordRoute: (path: string) => boolean,
) {
	const router = useRouter();
	const saved = useState<{ position: number; top: number } | undefined>(key);

	function visiblePanelBody() {
		const element = content.value;
		return element?.getClientRects().length ? element.closest<HTMLElement>('[data-slot="body"]') : null;
	}

	onBeforeRouteLeave((to) => {
		if (!isRecordRoute(to.path)) return;
		const position = router.options.history.state.position;
		const body = visiblePanelBody();
		if (typeof position === 'number' && body) {
			saved.value = { position, top: body.scrollTop };
		}
	});

	return async function restoreScroll() {
		const entry = saved.value;
		if (!entry || entry.position !== router.options.history.state.position) return;
		saved.value = undefined;
		await nextTick();
		const body = visiblePanelBody();
		if (body) body.scrollTop = entry.top;
	};
}
