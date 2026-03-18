<script>
	import Component from "./components/Component.svelte";
	import { Toolbar } from "@svar-ui/svelte-gantt";
	import { Segmented } from "@svar-ui/svelte-core";
	import WillowDarkIcon from "./icons/WillowDark.svelte";
	import WillowIcon from "./icons/Willow.svelte";

	let { skin, onchangeskin } = $props();
	let api = $state();

	const skins = [
		{
			id: "willow",
			label: "Willow",
			//component: Willow,
			icon: WillowIcon,
		},
		{
			id: "willow-dark",
			label: "Dark",
			//component: WillowDark,
			icon: WillowDarkIcon,
		},
	];
</script>

<div class="demo">
	<div class="toolbar">
		<div class="bar">
			<Toolbar {api} />
		</div>
		<div class="segmented-box">
			<Segmented
				value={skin}
				options={skins}
				css="segmented-themes"
				onchange={onchangeskin}
			>
				{#snippet children({ option })}
					{@const Icon = option.icon}
					<Icon />
					<span>{option.label}</span>
				{/snippet}
			</Segmented>
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
		padding: 2px 16px 16px 16px;
	}
	.bottom {
		flex: 1;
		height: 100%;
		overflow: hidden;
	}
	.toolbar {
		display: flex;
		justify-content: space-between;
		overflow: hidden;
	}
	.toolbar :global(.wx-toolbar) {
		padding: 6px 0;
		overflow: hidden;
	}
	.toolbar :global(.wx-toolbar div:first-child) {
		padding-left: 0;
	}
	.segmented-box {
		padding: 10px 0px 10px 10px;
	}

	.segmented-box {
		:global(.segmented-themes) {
			height: 32px;
			padding: 2px;
			border-radius: 4px;
		}

		:global(.segmented-themes button) {
			font-size: 14px;
			font-weight: 400;
			line-height: 18px;
			color: var(--wx-color-font-alt);
			background-color: transparent;
			padding: 5px 12px;
			border: none;
		}

		:global(.segmented-themes button.wx-selected) {
			border-radius: 2px;
			font-weight: 500;
			color: var(--wx-color-font);
			box-shadow: 0px 0px 7px 0px rgba(66, 69, 76, 0.07);
			background: #fff;
		}

		:global(.segmented-themes button span) {
			margin-left: 4px;
		}
		:global(div.segmented-themes button svg) {
			height: 16px;
			width: 16px;
		}
	}
	:global(
			.wx-willow-dark-theme
				.segmented-box
				.segmented-themes
				button.wx-selected
		) {
		background: var(--wx-color-primary);
	}

	@media (max-width: 767px) {
		.bar {
			width: calc(100% - 96px);
			max-width: calc(100% - 96px);
		}
		.segmented-box {
			:global(.segmented-themes button span) {
				display: none;
			}
			/* :global(div.segmented-themes button svg) {
				height: 24px;
				width: 24px;
			}
			:global(div.segmented-themes button) {
				padding: 2px 7px;
			}
			:global(div.segmented-themes) {
				height: 44px;
			} */
		}
	}
</style>
