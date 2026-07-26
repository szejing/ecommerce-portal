<template>
	<div class="space-y-4">
		<h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
			{{ t('pages.storeProfilePage.operatingHoursAndOffDays') }}
		</h4>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			<UFormField :label="t('components.zInput.offDay')">
				<ZSelectMenuDays :days="offDays" @update:days="(d: string[]) => $emit('update:offDays', d)" />
			</UFormField>
			<UFormField :label="t('components.zInput.startTime')">
				<ZSelectMenuTime
					:title="timeSelectTitle"
					:time="startTime"
					value-format="hh24"
					type="start"
					@update:time="(v: string) => $emit('update:startTime', v)"
				/>
			</UFormField>
			<UFormField :label="t('components.zInput.endTime')">
				<ZSelectMenuTime
					:title="timeSelectTitle"
					:time="endTime"
					value-format="hh24"
					type="end"
					@update:time="(v: string) => $emit('update:endTime', v)"
				/>
			</UFormField>
		</div>
	</div>
</template>

<script lang="ts" setup>
const { t } = useI18n();
defineProps<{
	offDays: string[];
	startTime: string | null;
	endTime: string | null;
	timeSelectTitle: string;
}>();

defineEmits<{
	'update:offDays': [days: string[]];
	'update:startTime': [value: string];
	'update:endTime': [value: string];
}>();
</script>
