<script>
	import {
		Globals,
		Willow,
		WillowDark,
		Locale,
		popupContainer,
		Button,
	} from "@svar-ui/svelte-core";
	import Main from "./Main.svelte";
	import LogoIcon from "./icons/Logo.svelte";

	let { productLink, publicName } = $props();
	let skin = $state("willow");

	const isStandalone = $state(window.self === window.top);
	const DEMO_SECTION_URL = `https://svar.dev/svelte/${productLink}/`;

	function goBack() {
		window.location.href = DEMO_SECTION_URL;
	}

	function changeSkin({ value }) {
		skin = value;
	}
</script>

<Willow />
<WillowDark />

<div
	class="wx-willow-theme content"
	class:standalone={isStandalone}
	use:popupContainer
>
	<Locale>
		<Globals>
			<div class="header">
				{#if isStandalone}
					<div class="header-content">
						<div class="btn-box">
							<Button
								type="secondary"
								css="btn-back"
								icon="wxi-angle-left"
								onclick={goBack}
							>
								<div class="btn-back-content">
									<LogoIcon />
									<span>Go to {publicName} page</span>
								</div>
							</Button>
						</div>
						<h1>SVAR Svelte {publicName} - Live Demo</h1>
					</div>
				{/if}
			</div>
			<div class="wx-{skin}-theme main-content">
				<Main {skin} onchangeskin={changeSkin} />
			</div>
		</Globals>
	</Locale>
</div>

<style>
	* {
		-webkit-tap-highlight-color: transparent;
	}
	.content {
		height: 100%;
		width: 100%;
		overflow: hidden;
	}

	.header :global(*) {
		font-family: Roboto, Arial, Helvetica, sans-serif;
	}

	.header > div {
		height: 56px;
		display: flex;
		padding: 10px 16px;
		border-bottom: 1px solid #ebebeb;
	}
	.header-content {
		align-items: center;
		justify-content: center;
		position: relative;
	}

	.header-content h1 {
		font-size: 16px;
		font-weight: 500;
		line-height: 24px;
	}

	.btn-box {
		position: absolute;
		left: 16px;
	}

	.btn-box {
		:global(button.btn-back) {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 8px;
			padding: 6px;
			font-weight: 500;
			font-size: 14px;
			line-height: 18px;
			border: 1px solid #ebebeb;
			color: #2c2f3c;

			&:hover,
			&:focus {
				border: 1px solid #ebebeb;
				background: #f7f7f7;
			}
		}

		:global(button.btn-back i) {
			opacity: 1;
		}

		:global(button.btn-back .btn-back-content) {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 4px;
		}
	}

	.main-content {
		height: 100%;
	}
	.standalone .main-content {
		height: calc(100% - 56px);
	}

	@media (max-width: 767px) {
		.btn-box :global(button.btn-back) {
			justify-content: center;
			width: 36px;
			height: 36px;
			padding: 0;
		}
		.btn-box :global(button.btn-back > .btn-back-content) {
			display: none;
		}
		.header h1 {
			white-space: nowrap;
		}
		/* .standalone .main-content {
			height: calc(100% - 56px);
		} */
	}
</style>
