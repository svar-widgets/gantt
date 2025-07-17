<script>
	let { user } = $props();

	const url = "https://svar.dev/demos/grid/assets/avatars/";
	const avatar = $derived(
		user ? `${url}${user.label.replace(" ", "_")}.png` : ""
	);
</script>

<div class="container">
	<div class="avatar">
		{#if avatar}
			<div class="user-avatar">
				<img class="user-photo" alt="" src={avatar} />
			</div>
		{/if}
	</div>
	<div>{user?.label ?? ""}</div>
</div>

<style>
	.container {
		display: flex;
		align-items: center;
		padding: 0 4px;
	}

	.avatar {
		width: 40px;
	}

	.user-avatar {
		width: 30px;
		height: 30px;
		border-radius: 50%;
		background-color: #dfe2e6;
		text-align: center;
	}

	.user-photo {
		display: block;
		width: 100%;
		height: 100%;
		border-radius: 50%;
		background-color: #dfe2e6;
	}
</style>
