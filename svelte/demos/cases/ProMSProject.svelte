<script>
	import { getData } from "../data";
	import { Gantt } from "../../src";
	import { Toolbar, registerToolbarItem } from "@svar-ui/svelte-toolbar";
	import UploadButton from "../custom/UploadButton.svelte";
	registerToolbarItem("upload", UploadButton);

	let { skinSettings } = $props();
	const data = getData();
	let tasks = $state(data.tasks);
	let links = $state(data.links);

	const items = $derived([
		{
			id: "export",
			comp: "button",
			text: "Download MS Project XML",
		},
		{
			id: "import",
			comp: "upload",
			text: "Upload MS Project XML",
			onchange: importMSProject,
		},
	]);

	let api;
	function handleClick({ item }) {
		if (item.id === "export") {
			api.exec("export-data", { format: "mspx" });
		}
	}
	function importMSProject() {
		const file = document.getElementById("import-file").files[0];
		const reader = new FileReader();
		reader.onload = e => {
			const xml = e.target.result;
			api.exec("import-data", {
				data: xml,
			});
		};
		reader.readAsText(file);
	}
</script>

<Toolbar {items} onclick={handleClick} />
<div class="gtcell">
	<Gantt
		bind:this={api}
		{...skinSettings}
		{tasks}
		{links}
		scales={data.scales}
	/>
</div>

<style>
	.gtcell {
		position: relative;
		height: calc(100% - 48px);
		border-top: var(--wx-gantt-border);
	}
</style>
