<script lang="ts">
	import { Avatar } from "@svar-ui/svelte-core";
	import type { IUser } from "@svar-ui/svelte-core";
	import type { ITask } from "@svar-ui/svelte-gantt";
	import { users, type TUser } from "../data";

	type Props = {
		row?: ITask;
		user?: TUser;
	};

	let { row, user }: Props = $props();

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
	<Avatar value={value as IUser} />
	<div>{value?.label ?? ""}</div>
</div>

<style>
	.container {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	:global(.container > div) {
		margin-top: 5px;
	}
</style>
