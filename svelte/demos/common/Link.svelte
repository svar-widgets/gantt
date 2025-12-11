<script>
	import { link, location } from "svelte-spa-router";

	let { data, skin } = $props();

	let fullPath = $derived(data[0].replace(":skin", skin));
</script>

<a
	use:link={fullPath}
	href="/"
	class="demo"
	class:active={$location.startsWith(fullPath)}
>
	{data[1]}
	{#if data[4] && data[4].pro}
		<span class="pro">PRO</span>
	{/if}
</a>

<style>
	.demo {
		display: flex;
		align-items: center;
		font-weight: 400;
		padding: 8px 12px 8px 16px;
		border-left: 4px solid transparent;
		color: #595b66;
		list-style: none;
		cursor: pointer;
		text-decoration: none;
		min-height: 38px;
	}

	.demo.active {
		border-left-color: #fc6519;
	}

	.demo.active,
	.demo:hover {
		font-weight: 500;
		color: #42454d;
		background-color: #f1f1f1;
	}
	.pro {
		color: #fc6519;
		border: 1px solid #fc6519;
		border-radius: 4px;
		padding: 0px 8px;
		font-size: 12px;
		font-weight: 600;
		margin-left: auto;
	}
</style>
