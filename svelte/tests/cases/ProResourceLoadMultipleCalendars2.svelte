<script>
	import { getData } from "../../demos/data";
	import { Gantt, ResourceLoad, Editor } from "../../src";
	import { Field, Switch, Willow } from "@svar-ui/svelte-core";

	const data = getData("calendars");

	let api = $state();

	const resources = [
		{ id: "dev", name: "Developers team", open: true },
		{
			id: "r1",
			name: "Robert Williams",
			role: "Developer",
			color: "#5C6BC0",
			parent: "dev",
			calendar: "weekends-only-resource",
		},
		{
			id: "r6",
			name: "Sophia Martinez",
			role: "Senior Developer",
			color: "#26A69A",
			parent: "dev",
			calendar: "part-time-resource",
		},
		{
			id: "r7",
			name: "Noah Thompson",
			role: "Frontend Developer",
			color: "#29B6F6",
			parent: "dev",
		},
		{
			id: "alex-team",
			name: "Alex Brown team",
			open: true,
			parent: "dev",
		},
		{
			id: "r2",
			name: "Abram Herwitz",
			role: "Developer",
			color: "#7E57C2",
			parent: "alex-team",
			calendar: "wednesday-off-resource",
		},
		{
			id: "r3",
			name: "Christopher Robinson",
			role: "Developer",
			color: "#42A5F5",
			parent: "alex-team",
		},
		{
			id: "r8",
			name: "Olivia Johnson",
			role: "Backend Developer",
			color: "#3F51B5",
			parent: "alex-team",
		},
		{ id: "qa", name: "QA Team", open: true },
		{
			id: "r4",
			name: "James Wilson",
			role: "QA Engineer",
			color: "#FF9800",
			parent: "qa",
		},
		{
			id: "r5",
			name: "Emma Davis",
			role: "QA Lead",
			color: "#9C27B0",
			parent: "qa",
		},
		{
			id: "r9",
			name: "Mason Lee",
			role: "Automation QA Engineer",
			color: "#EC407A",
			parent: "qa",
		},
		{ id: "design", name: "Design Team", open: true },
		{
			id: "r10",
			name: "Ava Clark",
			role: "UI/UX Designer",
			color: "#AB47BC",
			parent: "design",
		},
		{
			id: "r11",
			name: "Liam Moore",
			role: "Product Designer",
			color: "#8D6E63",
			parent: "design",
		},
	];

	const assignments = [
		{ id: 1, task: 10, resource: "r1" },
		{ id: 2, task: 11, resource: "r3" },
		{ id: 3, task: 12, resource: "r2" },
		{ id: 4, task: 13, resource: "r4" },
		{ id: 5, task: 20, resource: "r1" },
		{ id: 6, task: 21, resource: "r2" },
	];

	let enabled = $state(true);

	const groupBy = $derived(enabled ? { field: "resource" } : null);
</script>

<Willow>
	<div class="demo">
		<div class="bar">
			<Field label="Group by resource" position="left">
				{#snippet children({ id })}
					<Switch {id} bind:value={enabled}></Switch>
				{/snippet}
			</Field>
		</div>
		<div class="main">
			<div class="gantt">
				<Gantt
					bind:this={api}
					tasks={data.tasks}
					columns={data.columns}
					{resources}
					{assignments}
					calendars={data.calendars}
					links={data.links}
					{groupBy}
					scales={data.scales}
					zoom
				/>
			</div>
			<div class="resource">
				<ResourceLoad
					{api}
					template={v => `${v.hours}h, ${v.percent}%`}
				/>
			</div>
			<Editor {api} />
		</div>
	</div>
</Willow>

<style>
	.demo {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.demo :global(.resource-calendar) {
		background-color: lavender;
	}

	:global(.wx-willow-dark-theme) .demo :global(.resource-calendar) {
		background-color: #2d3640;
	}

	.bar {
		padding: 12px;
		display: flex;
		align-items: center;
		border-bottom: var(--wx-gantt-border);
		& :global(.wx-field) {
			width: auto;
		}
		& :global(.wx-label) {
			width: auto !important;
			padding-top: 2px !important;
			white-space: nowrap;
		}
	}
	.main {
		width: 100%;
		height: calc(100% - 50px);
	}

	.gantt {
		height: 60%;
		border-bottom: 2px solid var(--wx-gantt-border-color);
	}
	.resource {
		height: 40%;
	}

	.demo :global(.calendar),
	.demo :global(.resource-calendar) {
		background-color: lavender;
	}

	:global(.wx-willow-dark-theme) .demo :global(.calendar),
	:global(.wx-willow-dark-theme) .demo :global(.resource-calendar) {
		background-color: #2d3640;
	}
</style>
