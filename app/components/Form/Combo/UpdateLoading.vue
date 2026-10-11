<template>
	<div class="w-full animate-in fade-in duration-200">
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
			<!-- Left sidebar nav skeleton -->
			<div class="hidden lg:block lg:col-span-2">
				<div class="sticky top-4 space-y-2">
					<template v-for="i in 2" :key="i">
						<div class="rounded-lg px-4 py-3 flex items-center gap-3">
							<USkeleton class="h-6 w-6 rounded-full shrink-0" />
							<div class="flex-1 min-w-0 space-y-2">
								<USkeleton class="h-4 w-24" />
								<USkeleton class="h-3 w-full max-w-[140px]" />
							</div>
						</div>
					</template>
				</div>
			</div>
			<!-- Center: cards skeleton -->
			<div class="lg:col-span-7 space-y-6">
				<!-- Card 1: Basic Information -->
				<div class="rounded-lg border border-neutral-200 shadow-md overflow-hidden">
					<div class="p-4 sm:p-6 border-b border-neutral-200">
						<div class="flex items-start justify-between gap-4">
							<div class="flex-1 space-y-2">
								<div class="flex items-center gap-2">
									<USkeleton class="h-6 w-6 rounded" />
									<USkeleton class="h-6 w-40" />
								</div>
								<USkeleton class="h-4 w-64" />
							</div>
							<USkeleton class="h-5 w-5 rounded shrink-0" />
						</div>
					</div>
					<div class="p-4 sm:p-6 space-y-6">
						<div class="flex justify-end">
							<USkeleton class="h-5 w-16 rounded" />
						</div>
						<USkeleton class="h-32 w-full rounded-lg" />
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div class="space-y-2">
								<USkeleton class="h-4 w-28" />
								<USkeleton class="h-3 w-48" />
								<USkeleton class="h-10 w-full" />
							</div>
							<div class="space-y-2">
								<USkeleton class="h-4 w-28" />
								<USkeleton class="h-3 w-48" />
								<USkeleton class="h-10 w-full" />
							</div>
						</div>
						<div class="space-y-2">
							<USkeleton class="h-4 w-32" />
							<USkeleton class="h-10 w-full" />
						</div>
						<USkeleton class="h-px w-full" />
						<div class="space-y-4">
							<USkeleton class="h-5 w-36" />
							<div class="flex flex-col gap-6 sm:flex-row sm:justify-between">
								<div class="space-y-2">
									<USkeleton class="h-4 w-20" />
									<USkeleton class="h-3 w-40" />
									<USkeleton class="h-[120px] w-[250px] rounded-xl" />
								</div>
								<div class="space-y-2">
									<USkeleton class="h-4 w-28" />
									<USkeleton class="h-3 w-40" />
									<USkeleton class="h-[120px] w-[250px] rounded-xl" />
								</div>
							</div>
						</div>
					</div>
				</div>
				<!-- Card 2: Pricing -->
				<div class="rounded-lg border border-neutral-200 shadow-md overflow-hidden">
					<div class="p-4 sm:p-6 border-b border-neutral-200">
						<div class="flex items-start justify-between gap-4">
							<div class="flex-1 space-y-2">
								<div class="flex items-center gap-2">
									<USkeleton class="h-6 w-6 rounded" />
									<USkeleton class="h-6 w-20" />
								</div>
								<USkeleton class="h-4 w-52" />
							</div>
							<USkeleton class="h-5 w-5 rounded shrink-0" />
						</div>
					</div>
					<div class="p-4 sm:p-6 space-y-6">
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
							<template v-for="j in 2" :key="j">
								<div class="space-y-2">
									<USkeleton class="h-4 w-28" />
									<USkeleton class="h-10 w-full" />
								</div>
							</template>
						</div>
						<USkeleton class="h-24 w-full rounded-lg" />
					</div>
				</div>
			</div>
			<!-- Right review skeleton -->
			<div class="lg:col-span-3">
				<div class="lg:sticky lg:top-2 rounded-lg border border-neutral-200 shadow-md overflow-hidden">
					<div class="p-4 border-b border-neutral-200 space-y-2">
						<USkeleton class="h-6 w-32" />
						<USkeleton class="h-4 w-48" />
					</div>
					<div class="p-4 space-y-4">
						<USkeleton class="h-16 w-full rounded-lg" />
						<template v-for="k in 3" :key="k">
							<USkeleton class="h-12 w-full rounded-lg" />
						</template>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup></script>
