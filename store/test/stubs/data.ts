import { ILink, ITask } from "../../src/types";
import { defaultColumns } from "../../src/columns";

type TDataType = "default" | "lazy" | "full" | "range" | "summaries" | "pretty";

export const cellWidth = 100;
export const cellHeight = 38;
export const scaleHeight = 30;
export const scales = [
	{ unit: "month", step: 1, format: "MMMM yyy" },
	{ unit: "day", step: 1, format: "d" },
];
export const taskTypes = [
	{ id: "task", label: "Task" },
	{ id: "milestone", label: "Milestone" },
	{ id: "project", label: "Project" },
];

function getTasks(type?: TDataType) {
	return typeof type !== "undefined"
		? [...tasks[type]]
		: [...tasks["default"]];
}

function getLinks(type?: TDataType) {
	if (typeof type !== "undefined") {
		const res = links[type];
		if (res) return [...res];
	}
	return [{ id: 1, source: 1, target: 2, type: "e2s" }];
}

export const getData = (type?: TDataType): any => {
	const tasks = getTasks(type) as ITask[];
	const links = getLinks(type) as ILink[];

	return {
		tasks,
		links,
		scales,
		cellWidth,
		cellHeight,
		scaleHeight,
		taskTypes,
		columns: defaultColumns,
	};
};

const rTasks = [] as ITask[];

for (let i = 1; i <= 20; i++) {
	rTasks.push({
		id: i,
		text: `Task ${i}`,
		type: "task",
		parent: 0,
		start: new Date(2024, 3, 2),
		end: new Date(2024, 3, 5),
	});
}

const summaryTasks = [
	{
		progress: 0,
		parent: 0,
		text: "[1] Master project",
		/* "start": new Date("2024-06-13 00:00:00"),
		"end": new Date("2024-06-21 00:00:00"), */
		type: "summary",
		open: true,
		id: 1,
	},
	{
		progress: 0,
		parent: 10,
		text: "[2] Mini p task 2.1",
		start: new Date("2024-06-14 00:00:00"),
		end: new Date("2024-06-16 00:00:00"),
		type: "task",
		id: 2,
	},
	{
		type: "task",
		parent: 7,
		text: "[3] Mini p task 1",
		start: new Date("2024-06-14 00:00:00"),
		progress: 0,
		end: new Date("2024-06-16 00:00:00"),
		id: 3,
	},
	{
		progress: 0,
		parent: 8,
		text: "[4] Mini p task 1",
		start: new Date("2024-06-13 00:00:00"),
		end: new Date("2024-06-14 00:00:00"),
		type: "task",
		id: 4,
	},
	{
		progress: 0,
		parent: 11,
		text: "[5] Mini p 2.3 task 1",
		start: new Date("2024-06-19 00:00:00"),
		end: new Date("2024-06-20 00:00:00"),
		type: "task",
		id: 5,
	},
	{
		progress: 0,
		parent: 10,
		text: "[6] Mini p task 2.2",
		start: new Date("2024-06-15 00:00:00"),
		end: new Date("2024-06-19 00:00:00"),
		type: "task",
		id: 6,
	},
	{
		progress: 0,
		parent: 1,
		text: "[7] Mini project 1",
		/* "start": new Date("2024-06-14 00:00:00"),
		"end": new Date("2024-06-16 00:00:00"), */
		position: 0,
		type: "summary",
		open: true,
		id: 7,
	},
	{
		progress: 0,
		parent: 1,
		text: "[8] Mini project 2",
		/* "start": new Date("2024-06-13 00:00:00"),
		"end": new Date("2024-06-21 00:00:00"), */
		type: "summary",
		open: true,
		position: 0,
		id: 8,
	},
	{
		start: new Date("2024-06-15 00:00:00"),
		end: new Date("2024-06-16 00:00:00"),
		progress: 0,
		text: "[9] Mini p task 2",
		position: 0,
		parent: 7,
		type: "task",
		id: 9,
	},
	{
		progress: 0,
		parent: 8,
		text: "[10] Mini p task 2",
		start: new Date("2024-06-14 00:00:00"),
		end: new Date("2024-06-17 00:00:00"),
		type: "task",
		open: true,
		id: 10,
	},
	{
		progress: 0,
		parent: 8,
		text: "[11] Mini project 2.3",
		/* "start": new Date("2024-06-19 00:00:00"),
		"end": new Date("2024-06-21 00:00:00"), */
		type: "summary",
		open: true,
		id: 11,
	},
	{
		progress: 0,
		parent: 11,
		text: "[12] Mini p 2.3 task 2",
		start: new Date("2024-06-20 00:00:00"),
		end: new Date("2024-06-21 00:00:00"),
		type: "task",
		id: 12,
	},
	{
		progress: 0,
		parent: 11,
		text: "[13] The end",
		start: new Date("2024-06-21 00:00:00"),
		type: "milestone",
		id: 13,
	},
];

const prettyTasks = [
	{
		id: 1,
		// start: new Date(2024, 3, 2),
		// end: new Date(2024, 3, 17),
		text: "Project planning",
		progress: 30,
		parent: 0,
		type: "summary",
		open: true,
		details: "Outline the project's scope and resources.",
	},
	{
		id: 10,
		start: new Date(2024, 3, 2),
		end: new Date(2024, 3, 5),
		text: "Marketing analysis",
		progress: 100,
		parent: 1,
		type: "task",
		details: "Analyze market trends and competitors.",
	},
	{
		id: 11,
		start: new Date(2024, 3, 5),
		end: new Date(2024, 3, 7),
		text: "Discussions",
		progress: 100,
		parent: 1,
		type: "task",
		details: "Team discussions on project strategies.",
	},
	{
		id: 110,
		start: new Date(2024, 3, 6),
		end: new Date(2024, 3, 9),
		text: "Initial design",
		progress: 60,
		parent: 11,
		type: "task",
		details: "Draft initial design concepts.",
	},
	{
		id: 111,
		start: new Date(2024, 3, 9),
		text: "Presentation",
		progress: 0,
		parent: 11,
		type: "milestone",
		details: "Present initial designs to stakeholders.",
	},
	{
		id: 112,
		start: new Date(2024, 3, 7),
		end: new Date(2024, 3, 12),
		text: "Prototyping",
		progress: 10,
		parent: 11,
		type: "task",
	},
	{
		id: 113,
		start: new Date(2024, 3, 8),
		end: new Date(2024, 3, 17),
		text: "User testing",
		progress: 0,
		parent: 11,
		type: "task",
	},

	{
		id: 12,
		start: new Date(2024, 3, 8),
		text: "Approval of strategy",
		progress: 100,
		parent: 1,
		type: "milestone",
	},

	{
		id: 2,
		/* start: new Date(2024, 3, 2),
		end: new Date(2024, 3, 12), */
		text: "Project management",
		progress: 10,
		parent: 0,
		type: "summary",
		open: true,
	},
	{
		id: 20,
		start: new Date(2024, 3, 2),
		end: new Date(2024, 3, 6),
		text: "Resource planning",
		progress: 10,
		parent: 2,
		type: "task",
	},
	{
		id: 21,
		start: new Date(2024, 3, 6),
		end: new Date(2024, 3, 8),
		text: "Getting approval",
		progress: 10,
		parent: 2,
		type: "task",
	},
	{
		id: 22,
		start: new Date(2024, 3, 8),
		end: new Date(2024, 3, 10),
		text: "Team introduction",
		progress: 0,
		parent: 2,
		type: "task",
	},
	{
		id: 23,
		start: new Date(2024, 3, 10),
		end: new Date(2024, 3, 12),
		text: "Resource management",
		progress: 10,
		parent: 2,
		type: "task",
	},

	{
		id: 3,
		/* start: new Date(2024, 3, 9),
		end: new Date(2024, 4, 15), */
		text: "Development",
		progress: 30,
		parent: 0,
		type: "summary",
		open: true,
	},
	{
		id: 30,
		start: new Date(2024, 3, 9),
		end: new Date(2024, 3, 15),
		text: "Prototyping",
		progress: 3,
		parent: 3,
		type: "task",
	},
	{
		id: 31,
		start: new Date(2024, 3, 15),
		end: new Date(2024, 3, 30),
		text: "Basic functionality",
		progress: 0,
		parent: 3,
		type: "task",
	},
	{
		id: 32,
		start: new Date(2024, 3, 30),
		end: new Date(2024, 4, 15),
		text: "Finalizing MVA",
		progress: 0,
		parent: 3,
		type: "task",
	},

	{
		id: 4,
		/* start: new Date(2024, 3, 9),
		end: new Date(2024, 4, 25), */
		text: "Testing",
		progress: 3,
		parent: 0,
		type: "summary",
		open: true,
	},
	{
		id: 40,
		start: new Date(2024, 3, 9),
		end: new Date(2024, 3, 15),
		text: "Testing prototype",
		progress: 3,
		parent: 4,
		type: "task",
	},
	{
		id: 41,
		start: new Date(2024, 3, 15),
		end: new Date(2024, 3, 30),
		text: "Testing basic features",
		progress: 0,
		parent: 4,
		type: "task",
	},
	{
		id: 42,
		start: new Date(2024, 3, 30),
		end: new Date(2024, 4, 15),
		text: "Testing MVA",
		progress: 0,
		parent: 4,
		type: "task",
	},
	{
		id: 43,
		start: new Date(2024, 4, 15),
		end: new Date(2024, 4, 25),
		text: "Beta testing",
		progress: 0,
		parent: 4,
		type: "task",
		details:
			"Comprehensive testing of the beta version before the final release.",
	},

	{
		id: 5,
		start: new Date(2024, 4, 25),
		text: "Release 1.0.0",
		progress: 0,
		parent: 0,
		type: "milestone",
		details: "Official release of version 1.0.0 to the public.",
	},
];

const tasks = {
	default: [
		{
			id: 1,
			text: "Task 1",
			type: "task",
			parent: 0,
			start: new Date(2024, 3, 2),
			end: new Date(2024, 3, 5),
		},
		{
			id: 2,
			text: "Task 2",
			type: "task",
			parent: 0,
			start: new Date(2024, 3, 6),
			end: new Date(2024, 3, 8),
		},
	],
	lazy: [
		{
			id: 1,
			text: "Task 1",
			type: "task",
			parent: 0,
			start: new Date(2024, 3, 2),
			end: new Date(2024, 3, 5),
		},
		{
			id: 2,
			text: "Task 2",
			type: "task",
			parent: 0,
			start: new Date(2024, 3, 6),
			end: new Date(2024, 3, 8),
			lazy: true,
			open: false,
		},
	],
	full: [
		{
			id: 1,
			start: new Date(2024, 3, 2),
			end: new Date(2024, 3, 17),
			text: "Project planning",
			progress: 30,
			parent: 0,
			type: "project",
			open: true,
			details: "Outline the project's scope and resources.",
		},
		{
			id: 10,
			start: new Date(2024, 3, 2),
			end: new Date(2024, 3, 5),
			text: "Marketing analysis",
			progress: 100,
			parent: 1,
			type: "task",
			details: "Analyze market trends and competitors.",
		},
		{
			id: 11,
			start: new Date(2024, 3, 5),
			end: new Date(2024, 3, 7),
			text: "Discussions",
			progress: 100,
			parent: 1,
			type: "task",
			details: "Team discussions on project strategies.",
		},
		{
			id: 110,
			start: new Date(2024, 3, 6),
			end: new Date(2024, 3, 9),
			text: "Initial design",
			progress: 60,
			parent: 11,
			type: "task",
			details: "Draft initial design concepts.",
		},
		{
			id: 111,
			start: new Date(2024, 3, 9),
			text: "Presentation",
			progress: 0,
			parent: 11,
			type: "milestone",
			details: "Present initial designs to stakeholders.",
		},
		{
			id: 112,
			start: new Date(2024, 3, 7),
			end: new Date(2024, 3, 12),
			text: "Prototyping",
			progress: 10,
			parent: 11,
			type: "task",
		},
		{
			id: 113,
			start: new Date(2024, 3, 8),
			end: new Date(2024, 3, 17),
			text: "User testing",
			progress: 0,
			parent: 11,
			type: "task",
		},

		{
			id: 12,
			start: new Date(2024, 3, 8),
			text: "Approval of strategy",
			progress: 100,
			parent: 1,
			type: "milestone",
		},

		{
			id: 2,
			start: new Date(2024, 3, 2),
			end: new Date(2024, 3, 12),
			text: "Project management",
			progress: 10,
			parent: 0,
			type: "project",
			open: true,
		},
		{
			id: 20,
			start: new Date(2024, 3, 2),
			end: new Date(2024, 3, 6),
			text: "Resource planning",
			progress: 10,
			parent: 2,
			type: "task",
		},
		{
			id: 21,
			start: new Date(2024, 3, 6),
			end: new Date(2024, 3, 8),
			text: "Getting approval",
			progress: 10,
			parent: 2,
			type: "task",
		},
		{
			id: 22,
			start: new Date(2024, 3, 8),
			end: new Date(2024, 3, 10),
			text: "Team introduction",
			progress: 0,
			parent: 2,
			type: "task",
		},
		{
			id: 23,
			start: new Date(2024, 3, 10),
			end: new Date(2024, 3, 12),
			text: "Resource management",
			progress: 10,
			parent: 2,
			type: "task",
		},
		{
			id: 3,
			start: new Date(2024, 3, 9),
			end: new Date(2024, 4, 15),
			text: "Development",
			progress: 30,
			parent: 0,
			type: "project",
			open: true,
		},
		{
			id: 30,
			start: new Date(2024, 3, 9),
			end: new Date(2024, 3, 15),
			text: "Prototyping",
			progress: 3,
			parent: 3,
			type: "task",
		},
		{
			id: 31,
			start: new Date(2024, 3, 15),
			end: new Date(2024, 3, 30),
			text: "Basic functionality",
			progress: 0,
			parent: 3,
			type: "task",
		},
		{
			id: 32,
			start: new Date(2024, 3, 30),
			end: new Date(2024, 4, 15),
			text: "Finalizing MVA",
			progress: 0,
			parent: 3,
			type: "task",
		},

		{
			id: 4,
			start: new Date(2024, 3, 9),
			end: new Date(2024, 4, 25),
			text: "Testing",
			progress: 3,
			parent: 0,
			type: "project",
			open: true,
		},
		{
			id: 40,
			start: new Date(2024, 3, 9),
			end: new Date(2024, 3, 15),
			text: "Testing prototype",
			progress: 3,
			parent: 4,
			type: "task",
		},
		{
			id: 41,
			start: new Date(2024, 3, 15),
			end: new Date(2024, 3, 30),
			text: "Testing basic features",
			progress: 0,
			parent: 4,
			type: "task",
		},
		{
			id: 42,
			start: new Date(2024, 3, 30),
			end: new Date(2024, 4, 15),
			text: "Testing MVA",
			progress: 0,
			parent: 4,
			type: "task",
		},
		{
			id: 43,
			start: new Date(2024, 4, 15),
			end: new Date(2024, 4, 25),
			text: "Beta testing",
			progress: 0,
			parent: 4,
			type: "task",
			details:
				"Comprehensive testing of the beta version before the final release.",
		},

		{
			id: 5,
			start: new Date(2024, 4, 25),
			text: "Release 1.0.0",
			progress: 0,
			parent: 0,
			type: "milestone",
			details: "Official release of version 1.0.0 to the public.",
		},
	],
	range: rTasks,
	summaries: summaryTasks,
	pretty: prettyTasks,
};

const summaryLinks = [
	{
		source: 5,
		target: 12,
		type: "e2s",
		id: 1,
	},
	{
		source: 7,
		target: 3,
		type: "s2s",
		id: 2,
	},
	{
		source: 4,
		target: 10,
		type: "e2s",
		id: 3,
	},
	{
		source: 10,
		target: 6,
		type: "s2s",
		id: 4,
	},
	{
		source: 3,
		target: 9,
		type: "e2s",
		id: 5,
	},
	{
		source: 10,
		target: 2,
		type: "s2s",
		id: 6,
	},
	{
		source: 8,
		target: 4,
		type: "s2s",
		id: 7,
	},
];

const prettyLinks = [
	{
		id: 1,
		source: 10,
		target: 11,
		type: "e2s",
	},
	{
		id: 2,
		source: 11,
		target: 12,
		type: "e2s",
	},
	{
		id: 3,
		source: 110,
		target: 111,
		type: "e2s",
	},
	{
		id: 4,
		source: 20,
		target: 21,
		type: "e2s",
	},
	{
		id: 5,
		source: 21,
		target: 22,
		type: "e2s",
	},
	{
		id: 6,
		source: 22,
		target: 23,
		type: "e2s",
	},
	{
		id: 7,
		source: 42,
		target: 5,
		type: "e2s",
	},
];

const links = {
	full: [
		{
			id: 1,
			source: 10,
			target: 11,
			type: "e2s",
		},
		{
			id: 2,
			source: 11,
			target: 12,
			type: "e2s",
		},
		{
			id: 3,
			source: 110,
			target: 111,
			type: "e2s",
		},
		{
			id: 4,
			source: 20,
			target: 21,
			type: "e2s",
		},
		{
			id: 5,
			source: 21,
			target: 22,
			type: "e2s",
		},
		{
			id: 6,
			source: 22,
			target: 23,
			type: "e2s",
		},
		{
			id: 7,
			source: 42,
			target: 5,
			type: "e2s",
		},
	],
	summaries: summaryLinks,
	pretty: prettyLinks,
};

export const summaryDates = {
	1: {
		start: new Date("2024-06-13 00:00:00"),
		end: new Date("2024-06-21 00:00:00"),
	},
	7: {
		start: new Date("2024-06-14 00:00:00"),
		end: new Date("2024-06-16 00:00:00"),
	},
	8: {
		start: new Date("2024-06-13 00:00:00"),
		end: new Date("2024-06-21 00:00:00"),
	},
	11: {
		start: new Date("2024-06-19 00:00:00"),
		end: new Date("2024-06-21 00:00:00"),
	},
};

export const summaryPrettyDates = {
	1: {
		start: new Date(2024, 3, 2),
		end: new Date(2024, 3, 17),
	},
	2: {
		start: new Date(2024, 3, 2),
		end: new Date(2024, 3, 12),
	},
	3: {
		start: new Date(2024, 3, 9),
		end: new Date(2024, 4, 15),
	},
	4: {
		start: new Date(2024, 3, 9),
		end: new Date(2024, 4, 25),
	},
};
