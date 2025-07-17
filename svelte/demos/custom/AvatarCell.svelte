<script>
	import UserStub from "./UserStub.svelte";
	import { users } from "../data";

	let { row } = $props();

	const user = $derived(users.find(u => u.id == row.assigned));
</script>

<UserStub {user} />
