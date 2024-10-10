<script>
	export let routes;
</script>

<code
	><pre>
{#each routes as route}
			{'"' + route + '",\n'}
		{/each}
</pre></code
>

<style>
	pre {
		white-space: pre-wrap;
	}
</style>
