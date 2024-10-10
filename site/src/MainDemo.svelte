<script>
	import ThemeSelect from "./ThemeSelect.svelte";
	import Component from "./Component.svelte";
	import Toolbar from "./Toolbar.svelte";

	export let skin;
	function selectSkin(ev) {
		skin = ev.detail.selected.id;
	}

	let api;
</script>

<div class="demo" style="padding: 10px 20px;">
	<div class="toolbar">
		<div class="bar">
			<Toolbar {api} />
		</div>
		<div class="control">
			<span>Theme</span>
			<ThemeSelect bind:value={skin} on:select={selectSkin} />
		</div>
	</div>
	<div class="bottom">
		{#key skin}
			<Component bind:api />
		{/key}
	</div>
</div>

<style>
	.demo {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.bottom {
		flex: 1;
		height: 100%;
		overflow: hidden;
	}
	.toolbar {
		display: flex;
		justify-content: space-between;
	}
	.control {
		width: 212px;
		display: flex;
		gap: 8px;
		align-items: center;
	}
</style>
