<script>
	import { createEventDispatcher } from "svelte";
	import { uid } from "wx-lib-state";

	let {
		label = "",
		value = $bindable(0),
		step = 1,
		min = 1,
		max = Infinity,
	} = $props();

	const dispatch = createEventDispatcher();
	const digits = new RegExp("^[0-9]+$");

	let error = $state(false);

	function dec() {
		if (value <= min) return;
		value -= step;
		dispatch("change", { value });
	}

	function inc() {
		if (value >= max) return;
		value += step;
		dispatch("change", { value });
	}

	function blur() {
		const tValue =
			Math.round(Math.min(max, Math.max(value, min)) / step) * step;
		value = isNaN(tValue) ? 0 : tValue;
	}

	function input(e) {
		let v = e.target.value;
		if (digits.test(v)) {
			error = false;
			dispatch("change", { value: v * 1 });
		} else {
			error = true;
		}
	}

	const id = uid();
</script>

<div class="wx-counter">
	<label class="wx-label" for={id}>{label}</label>
	<div class="wx-controls">
		<button aria-label="-" class="wx-btn wx-btn-dec" onclick={dec}>
			<svg
				class="wx-dec"
				width="12"
				height="2"
				viewBox="0 0 12 2"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path d="M11.2501 1.74994H0.750092V0.249939H11.2501V1.74994Z" />
			</svg>
		</button>
		<input
			{id}
			type="text"
			class="wx-input"
			class:wx-error={error}
			required
			bind:value
			onblur={blur}
			oninput={input}
		/>
		<button aria-label="+" class="wx-btn wx-btn-inc" onclick={inc}>
			<svg
				class="wx-inc"
				width="12"
				height="12"
				viewBox="0 0 12 12"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M11.2501
					6.74994H6.75009V11.2499H5.25009V6.74994H0.750092V5.24994H5.25009V0.749939H6.75009V5.24994H11.2501V6.74994Z"
				/>
			</svg>
		</button>
	</div>
</div>

<style>
	.wx-counter {
		margin-bottom: 20px;
	}

	.wx-label {
		display: block;
		margin-bottom: 10px;
		font-family: var(--wx-label-font-family);
		font-size: var(--wx-label-font-size);
		color: var(--wx-label-font-color);
	}

	.wx-controls {
		display: flex;
	}

	.wx-input {
		box-sizing: border-box;
		background: var(--wx-background);
		width: 40px;
		height: 32px;
		border: var(--wx-input-border);
		border-radius: var(--wx-input-border-radius);
		font-family: var(--wx-input-font-family);
		font-size: var(--wx-input-font-size);
		color: var(--wx-input-font-color);
		text-align: center;
		outline: none;
	}

	.wx-input:focus {
		border: 1px solid var(--wx-input-focus-color);
	}

	.wx-input.wx-error {
		border: 1px solid var(--wx-color-danger);
	}

	.wx-btn {
		box-sizing: border-box;
		display: flex;
		justify-content: center;
		align-items: center;
		width: 30px;
		height: 32px;
		border: var(--wx-input-border);
		border-radius: var(--wx-input-border-radius);
		font-family: var(--wx-input-font-family);
		font-size: var(--wx-input-font-size);
		color: var(--wx-input-font-color);
		background-color: inherit;
		outline: none;
		cursor: pointer;
	}

	.wx-btn:active {
		border: var(--wx-input-border-focus);
	}

	.wx-btn-dec {
		border-right: 1px solid transparent;
		border-radius: 2px 0 0 2px;
	}
	.wx-btn-inc {
		border-left: 1px solid transparent;
		border-radius: 0 2px 2px 0;
	}

	.wx-dec,
	.wx-inc {
		fill: var(--wx-color-primary);
	}
</style>
