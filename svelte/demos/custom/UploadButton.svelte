<script>
	let { text, onchange } = $props();

	let fileInput;

	function handleClick() {
		fileInput.click();
	}

	function handleChange() {
		if (onchange) {
			onchange();
		}
	}
</script>

<button class="button" onclick={handleClick}>
	{text}
</button>
<input
	bind:this={fileInput}
	id="import-file"
	type="file"
	accept=".xml"
	onchange={handleChange}
	style="display: none;"
/>

<style>
	.button {
		font-size: 14px;
		line-height: 20px;
		font-weight: 600;
		padding: 5px 16px;
		border: 1px solid transparent;
		border-radius: 3px;
		background-color: #f2f2f7;
		color: #2c2f3c;
	}
	:global(.wx-willow-dark-theme .button) {
		background-color: #384047;
		color: rgba(255, 255, 255, 0.9);
	}
</style>
