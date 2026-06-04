<script>
	import { getData, assignments } from "../../demos/data";
	import { Gantt, ResourceLoad } from "../../src";
	import { Willow } from "@svar-ui/svelte-core";

	const data = getData("calendar");

	let api = $state();

	const resources = [
		{ id: "dev", name: "Developers team", open: true },
		{
			id: "r1",
			name: "Robert Williams",
			role: "Developer",
			color: "#5C6BC0",
			parent: "dev",
		},
		{
			id: "r6",
			name: "Sophia Martinez",
			role: "Senior Developer",
			color: "#26A69A",
			parent: "dev",
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

	const calendar = {
		weekHours: {
			monday: 8,
			tuesday: 8,
			wednesday: 8,
			thursday: 8,
			friday: 8,
			saturday: 0,
			sunday: 0,
		},
	};
</script>

<Willow>
	<div class="gantt">
		<Gantt
			bind:this={api}
			tasks={data.tasks}
			links={data.links}
			scales={data.scales}
			{resources}
			{assignments}
			{calendar}
		/>
	</div>
	<div class="resource">
		<ResourceLoad {api} template={v => `${v.hours}h (${v.percent}%)`} />
	</div>
</Willow>

<style>
	.gantt {
		height: 70%;
		border-bottom: 2px solid var(--wx-gantt-border-color);
	}
	.resource {
		height: 30%;
	}
</style>
