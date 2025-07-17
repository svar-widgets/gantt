<script>
	import { getData } from "../data";
	import { Gantt, ContextMenu, Toolbar, Editor } from "../../src/";
	import { Segmented, Locale } from "wx-svelte-core";
	import { cn } from "wx-gantt-locales";
	import { cn as cnCore } from "wx-core-locales";

	let { skinSettings } = $props();

	let api = $state();

	const data = getData();

	const langs = [
		{ id: "en", label: "EN" },
		{ id: "cn", label: "CN" },
	];
	let lang = $state("en");
</script>

<div class="rows">
	<div class="bar">
		<Segmented options={langs} bind:value={lang} />
	</div>
	{#if lang === "en"}
		<Toolbar {api} />
		<div class="gtcell">
			<ContextMenu {api}>
				<Gantt
					{...skinSettings}
					tasks={data.tasks}
					links={data.links}
					scales={data.scales}
					bind:this={api}
				/>
			</ContextMenu>
			<Editor {api} />
		</div>
	{/if}

	{#if lang === "cn"}
		<Locale words={{ ...cn, ...cnCore }}>
			<Toolbar {api} />
			<div class="gtcell">
				<ContextMenu {api}>
					<Gantt
						{...skinSettings}
						tasks={data.tasks}
						links={data.links}
						scales={data.scales}
						bind:this={api}
					/>
				</ContextMenu>
				<Editor {api} />
			</div>
		</Locale>
	{/if}
</div>

<style>
	.rows {
		position: relative;
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	.bar {
		padding: 12px;
		border-bottom: var(--wx-gantt-border);
	}
	.gtcell {
		position: relative;
		height: calc(100% - 106px);
		border-top: var(--wx-gantt-border);
	}
</style>
