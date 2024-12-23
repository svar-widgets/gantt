<script>
	let { appearance = "primary", icon = "", onclick } = $props();
</script>

<button class="wx-button {appearance}" {onclick}>
	{#if icon}<i class="wx-button-icon {icon}"></i>{/if}
</button>

<style>
	.wx-button {
		width: 40px;
		height: 40px;
		border: none;
		outline: none;
		border-radius: 50%;
		cursor: pointer;

		padding-top: 7px;
	}

	.wx-primary {
		color: var(--wx-color-primary-font);
		background-color: var(--wx-color-primary);
	}

	.wx-primary:hover {
		background-color: #0b9db1;
	}

	.wx-transparent {
		width: 40px;
		height: 40px;

		color: var(--wx-color-primary-font);
		background-color: rgba(99, 99, 99, 0.45);
	}

	.wx-transparent:hover {
		background-color: rgba(69, 69, 69, 0.45);
	}

	.wx-button-icon {
		font-size: 20px;
		padding-top: 2px;
	}
</style>
