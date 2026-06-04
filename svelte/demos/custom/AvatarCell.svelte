<script>
	import { Avatar } from "@svar-ui/svelte-core";
	import { users } from "../data";

	let { row, user } = $props();

	const url = "https://svar.dev/demos/grid/assets/avatars/";

	const userData = $derived(
		row ? users.find(u => u.id == row.assigned) : user
	);

	const value = $derived.by(() => {
		if (userData)
			userData.avatar = `${url}${(userData.label || "").replace(" ", "_")}.png`;
		return userData;
	});
</script>

<div class="container">
	<Avatar {value} />
	<div>{value?.label ?? ""}</div>
</div>

<style>
	.container {
		display: flex;
		align-items: center;
		gap: 4px;
	}
</style>
