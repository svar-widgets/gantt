<script>
	import { RichSelect } from "wx-svelte-core";
	export let value = "willow";

	const skins = [
		{
			id: "willow",
			css: "wx-willow-theme",
			name: "Willow",
			color: "#37a9ef",
			color2: "#fff",
		},
		{
			id: "willow-dark",
			css: "wx-willow-dark-theme",
			name: "Dark",
			color: "#7a67eb",
			color2: "#384047",
		},
	];
</script>

<div style="width: 170px">
	<RichSelect options={skins} let:option bind:value on:select>
		<div style="display:flex;gap:8px">
			<div class="round" style="border: 2px solid {option.color}">
				<div class="color" style="background:{option.color}"></div>
				<div class="color" style="background:{option.color2}"></div>
			</div>
			<span>{option.name}</span>
		</div>
		<style>
			.round {
				width: 20px;
				height: 20px;
				border-radius: 50%;
				display: flex;
			}
			.color {
				width: 50%;
				height: 100%;
			}
			.color:first-child {
				border-radius: 12px 0 0 12px;
			}
			.color:last-child {
				border-radius: 0 12px 12px 0;
			}
		</style>
	</RichSelect>
</div>
