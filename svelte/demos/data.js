import { format } from "date-fns";

export const weekScaleTemplate = (a, b) => {
	return `${format(a, "MMM d")} - ${format(b, "MMM d")}`;
};

export const dayStyle = a => {
	const day = a.getDay() == 5 || a.getDay() == 6;
	return day ? "sday" : "";
};

export const complexScales = [
	{ unit: "year", step: 1, format: "%Y" },
	{ unit: "month", step: 2, format: "%F %Y" },
	{ unit: "week", step: 1, format: "%w" },
	{ unit: "day", step: 1, format: "%j", css: dayStyle },
];

export const bigScales = [
	{ unit: "year", step: 1, format: "%Y" },
	{ unit: "quarter", step: 1, format: "%Q %Y" },
	{ unit: "month", step: 1, format: "%F %Y" },
	{ unit: "week", step: 1, format: weekScaleTemplate },
];

const generatedLinks = [
	{ id: 1, source: 3, target: 4, type: "e2s" },
	{ id: 2, source: 1, target: 2, type: "e2s" },
	{ id: 24, source: 1, target: 13, type: "s2s" },
	{ id: 22, source: 1, target: 6, type: "s2s" },
	{ id: 23, source: 1, target: 3, type: "s2s" },
	{ id: 21, source: 8, target: 1, type: "s2s" },
	{ id: 25, source: 1, target: 14, type: "s2s" },
	{ id: 26, source: 1, target: 15, type: "s2s" },
	{ id: 27, source: 1, target: 16, type: "s2s" },
	{ id: 28, source: 1, target: 14, type: "s2s" },
	{ id: 3, source: 5, target: 6, type: "s2e" },
	{ id: 4, source: 8, target: 6, type: "s2s" },
];

function getGeneratedTasks(prefix, maxSize, maxYears) {
	maxYears = maxYears || 100;
	maxSize = maxSize || 50;
	prefix = prefix || "";
	const tasks = [];
	for (let i = 1; i <= maxSize; i++) {
		const ii = i % (365 * maxYears);

		let start = 2 + ii - (ii >= 13 ? 12 : 0);
		let end = start + 1 + Math.round(Math.random() * 2);
		tasks.push({
			id: i,
			start: new Date(2020, 2, start),
			end: new Date(2020, 2, end),
			text: prefix + "Task " + i,
			progress: Math.round((100 * i) / maxSize),
			parent: 0,
			type: "task",
		});
	}

	tasks[3].parent = 3;
	tasks[4].parent = 3;
	tasks[5].parent = 3;
	tasks[6].parent = 6;
	tasks[7].parent = 6;
	tasks[8].parent = 6;
	tasks[9].parent = 9;
	tasks[10].parent = 9;
	tasks[11].parent = 9;

	tasks[2].type = "summary";
	tasks[5].type = "summary";
	tasks[8].type = "summary";
	tasks[11].type = "summary";
	tasks[15].type = "milestone";
	delete tasks[15].end;

	return tasks;
}

export function getGeneratedData(prefix, maxSize, maxYears) {
	const tasks = getGeneratedTasks(prefix, maxSize, maxYears);
	return { tasks, generatedLinks, scales };
}

const tasks = [
	{
		id: 1,
		base_start: new Date(2026, 3, 2),
		base_end: new Date(2026, 3, 16),
		text: "Project planning",
		progress: 40,
		parent: 0,
		type: "summary",
		open: true,
		details: "Outline the project's scope and resources.",
		assigned: "",
	},
	{
		id: 10,
		start: new Date(2026, 3, 2),
		duration: 3,
		text: "Marketing analysis",
		progress: 100,
		parent: 1,
		type: "task",
		details: "Analyze market trends and competitors.",
		assigned: 1,
	},
	{
		id: 11,
		start: new Date(2026, 3, 5),
		duration: 2,
		text: "Discussions",
		progress: 72,
		parent: 1,
		type: "task",
		details: "Team discussions on project strategies.",
		assigned: "",
	},
	{
		id: 110,
		start: new Date(2026, 3, 6),
		duration: 3,
		text: "Initial design",
		progress: 60,
		parent: 11,
		type: "task",
		details: "Draft initial design concepts.",
		assigned: "",
	},
	{
		id: 111,
		start: new Date(2026, 3, 9),
		text: "Presentation",
		progress: 0,
		parent: 11,
		type: "milestone",
		details: "Present initial designs to stakeholders.",
		assigned: "",
	},
	{
		id: 112,
		start: new Date(2026, 3, 7),
		duration: 5,
		text: "Prototyping",
		progress: 10,
		parent: 11,
		type: "task",
		details: "Build and iterate on early-stage prototypes.",
		assigned: "",
	},
	{
		id: 113,
		start: new Date(2026, 3, 12),
		duration: 4,
		text: "User testing",
		progress: 0,
		parent: 11,
		type: "task",
		details: "Collect user feedback to improve the design.",
		assigned: "",
	},

	{
		id: 12,
		start: new Date(2026, 3, 8),
		text: "Approval of strategy",
		progress: 100,
		parent: 1,
		type: "milestone",
		details: "Sign-off on the agreed project strategy.",
		assigned: "",
	},

	{
		id: 2,
		base_start: new Date(2026, 3, 2),
		base_end: new Date(2026, 3, 12),
		text: "Project management",
		progress: 8,
		parent: 0,
		type: "summary",
		open: true,
		details: "Coordinate resources, schedule, and deliverables.",
		assigned: 2,
	},
	{
		id: 20,
		start: new Date(2026, 3, 2),
		duration: 4,
		text: "Resource planning",
		progress: 10,
		parent: 2,
		type: "task",
		details: "Identify and allocate team resources and budget.",
		assigned: "",
	},
	{
		id: 21,
		start: new Date(2026, 3, 6),
		duration: 2,
		text: "Getting approval",
		progress: 10,
		parent: 2,
		type: "task",
		details: "Obtain stakeholder sign-off on the project plan.",
		assigned: "",
	},
	{
		id: 22,
		start: new Date(2026, 3, 8),
		duration: 2,
		text: "Team introduction",
		progress: 0,
		parent: 2,
		type: "task",
		details: "Onboard team members and align on goals.",
		assigned: "",
	},
	{
		id: 23,
		start: new Date(2026, 3, 10),
		duration: 2,
		text: "Resource management",
		progress: 10,
		parent: 2,
		type: "task",
		details: "Monitor and adjust resource allocation as needed.",
		assigned: "",
	},

	{
		id: 3,
		base_start: new Date(2026, 3, 9),
		base_end: new Date(2026, 3, 30),
		text: "Development",
		progress: 2,
		parent: 0,
		type: "summary",
		open: true,
		details: "Design, build, and iterate on the product.",
		assigned: "",
	},
	{
		id: 30,
		start: new Date(2026, 3, 9),
		duration: 6,
		text: "Prototyping",
		progress: 7,
		parent: 3,
		type: "task",
		details: "Build the initial product prototype for review.",
		assigned: 3,
	},
	{
		id: 31,
		start: new Date(2026, 3, 15),
		duration: 8,
		text: "Basic functionality",
		progress: 0,
		parent: 3,
		type: "task",
		details: "Implement the core features and workflows.",
		assigned: "",
	},
	{
		id: 32,
		start: new Date(2026, 3, 23),
		duration: 7,
		text: "Finalizing MVA",
		progress: 0,
		parent: 3,
		type: "task",
		details: "Polish and finalize the minimum viable artifact.",
		assigned: "",
	},

	{
		id: 4,
		base_start: new Date(2026, 3, 9),
		base_end: new Date(2026, 4, 3),
		text: "Testing",
		progress: 4,
		parent: 0,
		type: "summary",
		open: true,
		details: "Validate all features through structured testing.",
		assigned: "",
	},
	{
		id: 40,
		start: new Date(2026, 3, 9),
		duration: 4,
		text: "Testing prototype",
		progress: 24,
		parent: 4,
		type: "task",
		details: "Verify prototype behavior against requirements.",
		assigned: 4,
	},
	{
		id: 41,
		start: new Date(2026, 3, 15),
		duration: 6,
		text: "Testing basic features",
		progress: 0,
		parent: 4,
		type: "task",
		details: "Test core functionality for correctness.",
		assigned: "",
	},
	{
		id: 42,
		start: new Date(2026, 3, 30),
		duration: 3,
		text: "Testing MVA",
		progress: 0,
		parent: 4,
		type: "task",
		details: "Validate the minimum viable artifact before release.",
		assigned: "",
	},
	{
		id: 43,
		start: new Date(2026, 3, 23),
		duration: 10,
		text: "Beta testing",
		progress: 0,
		parent: 4,
		type: "task",
		details:
			"Comprehensive testing of the beta version before the final release.",
		assigned: "",
	},

	{
		id: 5,
		start: new Date(2026, 4, 3),
		text: "Release 1.0.0",
		progress: 0,
		parent: 0,
		type: "milestone",
		details: "Official release of version 1.0.0 to the public.",
		assigned: "",
	},
];

const calendarTasks = [
	{
		id: 1,
		//start: new Date(2026, 3, 2),
		//end: new Date(2026, 3, 18),
		text: "Project planning",
		progress: 40,
		parent: 0,
		type: "summary",
		open: true,
		details: "Outline the project's scope and resources.",
		assigned: "",
	},
	{
		id: 10,
		start: new Date(2026, 3, 2),
		duration: 3,
		text: "Marketing analysis",
		progress: 100,
		parent: 1,
		type: "task",
		details: "Analyze market trends and competitors.",
		assigned: 1,
	},
	{
		id: 11,
		start: new Date(2026, 3, 7),
		duration: 2,
		text: "Discussions",
		progress: 72,
		parent: 1,
		type: "task",
		details: "Team discussions on project strategies.",
		assigned: "",
	},
	{
		id: 110,
		start: new Date(2026, 3, 6),
		duration: 4,
		text: "Initial design",
		progress: 60,
		parent: 11,
		type: "task",
		details: "Draft initial design concepts.",
		assigned: "",
	},
	{
		id: 111,
		start: new Date(2026, 3, 11),
		text: "Presentation",
		progress: 0,
		parent: 11,
		type: "milestone",
		details: "Present initial designs to stakeholders.",
		assigned: "",
	},
	{
		id: 112,
		start: new Date(2026, 3, 13),
		duration: 3,
		text: "Prototyping",
		progress: 10,
		parent: 11,
		type: "task",
		details: "Build and iterate on early-stage prototypes.",
		assigned: "",
	},
	{
		id: 113,
		start: new Date(2026, 3, 16),
		duration: 4,
		text: "User testing",
		progress: 0,
		parent: 11,
		type: "task",
		details: "Collect user feedback to improve the design.",
		assigned: "",
	},

	{
		id: 12,
		start: new Date(2026, 3, 9),
		text: "Approval of strategy",
		progress: 100,
		parent: 1,
		type: "milestone",
		details: "Sign-off on the agreed project strategy.",
		assigned: "",
	},

	{
		id: 2,
		//start: new Date(2026, 3, 2),
		//end: new Date(2026, 3, 14),
		text: "Project management",
		progress: 8,
		parent: 0,
		type: "summary",
		open: true,
		details: "Coordinate resources, schedule, and deliverables.",
		assigned: 2,
	},
	{
		id: 20,
		start: new Date(2026, 3, 2),
		duration: 3,
		text: "Resource planning",
		progress: 10,
		parent: 2,
		type: "task",
		details: "Identify and allocate team resources and budget.",
		assigned: "",
	},
	{
		id: 21,
		start: new Date(2026, 3, 8),
		text: "Getting approval",
		progress: 10,
		parent: 2,
		type: "milestone",
		details: "Obtain stakeholder sign-off on the project plan.",
		assigned: "",
	},
	{
		id: 22,
		start: new Date(2026, 3, 8),
		duration: 2,
		text: "Team introduction",
		progress: 0,
		parent: 2,
		type: "task",
		details: "Onboard team members and align on goals.",
		assigned: "",
	},
	{
		id: 23,
		start: new Date(2026, 3, 10),
		duration: 2,
		text: "Resource management",
		progress: 10,
		parent: 2,
		type: "task",
		details: "Monitor and adjust resource allocation as needed.",
		assigned: "",
	},

	{
		id: 3,
		//start: new Date(2026, 3, 9),
		//end: new Date(2026, 4, 8),
		text: "Development",
		progress: 2,
		parent: 0,
		type: "summary",
		open: true,
		details: "Design, build, and iterate on the product.",
		assigned: "",
	},
	{
		id: 30,
		start: new Date(2026, 3, 13),
		duration: 4,
		text: "Prototyping",
		progress: 7,
		parent: 3,
		type: "task",
		details: "Build the initial product prototype for review.",
		assigned: 3,
	},
	{
		id: 31,
		start: new Date(2026, 3, 17),
		duration: 8,
		text: "Basic functionality",
		progress: 0,
		parent: 3,
		type: "task",
		details: "Implement the core features and workflows.",
		assigned: "",
	},
	{
		id: 32,
		start: new Date(2026, 3, 29),
		duration: 7,
		text: "Finalizing MVA",
		progress: 0,
		parent: 3,
		type: "task",
		details: "Polish and finalize the minimum viable artifact.",
		assigned: "",
	},

	{
		id: 4,
		//start: new Date(2026, 3, 9),
		//end: new Date(2026, 4, 13),
		text: "Testing",
		progress: 4,
		parent: 0,
		type: "summary",
		open: true,
		details: "Validate all features through structured testing.",
		assigned: "",
	},
	{
		id: 40,
		start: new Date(2026, 3, 17),
		duration: 4,
		text: "Testing prototype",
		progress: 24,
		parent: 4,
		type: "task",
		details: "Verify prototype behavior against requirements.",
		assigned: 4,
	},
	{
		id: 41,
		start: new Date(2026, 3, 29),
		duration: 6,
		text: "Testing basic features",
		progress: 0,
		parent: 4,
		type: "task",
		details: "Test core functionality for correctness.",
		assigned: "",
	},
	{
		id: 42,
		start: new Date(2026, 4, 8),
		duration: 3,
		text: "Testing MVA",
		progress: 0,
		parent: 4,
		type: "task",
		details: "Validate the minimum viable artifact before release.",
		assigned: "",
	},
	{
		id: 43,
		start: new Date(2026, 4, 13),
		duration: 3,
		text: "Beta testing",
		progress: 0,
		parent: 4,
		type: "task",
		details:
			"Comprehensive testing of the beta version before the final release.",
		assigned: "",
	},

	{
		id: 5,
		start: new Date(2026, 4, 18),
		text: "Release 1.0.0",
		progress: 0,
		parent: 0,
		type: "milestone",
		details: "Official release of version 1.0.0 to the public.",
		assigned: "",
	},
];
const links = [
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
	{
		id: 8,
		source: 112,
		target: 113,
		type: "e2s",
	},
	{
		id: 9,
		source: 30,
		target: 31,
		type: "e2s",
	},
	{
		id: 10,
		source: 31,
		target: 32,
		type: "e2s",
	},
	{
		id: 11,
		source: 32,
		target: 42,
		type: "e2s",
	},
];

const scales = [
	{ unit: "month", step: 1, format: "%F %Y" },
	{ unit: "day", step: 1, format: "%j", css: dayStyle },
];

const tasksHour = [
	{
		id: 1,
		start: new Date(2025, 3, 10, 8, 0),
		end: new Date(2025, 3, 10, 20, 0),
		text: "Preparing Venue",
		progress: 90,
		parent: 0,
		type: "summary",
		open: true,
		details: "Set up all physical and technical aspects of the venue.",
	},
	{
		id: 11,
		start: new Date(2025, 3, 10, 8, 0),
		end: new Date(2025, 3, 10, 12, 0),
		text: "Stage Setup",
		progress: 100,
		parent: 1,
		type: "task",
		details: "Arrange stage furniture, screens, and equipment.",
	},
	{
		id: 12,
		start: new Date(2025, 3, 10, 12, 0),
		end: new Date(2025, 3, 10, 17, 0),
		text: "Technical Setup",
		progress: 100,
		parent: 1,
		type: "task",
		details: "Configure AV systems, lighting, and streaming setup.",
	},
	{
		id: 13,
		start: new Date(2025, 3, 10, 14, 0),
		end: new Date(2025, 3, 10, 20, 0),
		text: "Decoration",
		progress: 85,
		parent: 1,
		type: "task",
		details: "Install decorations and branded visual elements.",
	},
	{
		id: 2,
		start: new Date(2025, 3, 10, 16, 0),
		end: new Date(2025, 3, 10, 22, 0),
		text: "Rehearsal Session",
		progress: 60,
		parent: 0,
		type: "summary",
		open: true,
		details: "Run full rehearsals to ensure a smooth event.",
	},
	{
		id: 21,
		start: new Date(2025, 3, 10, 16, 0),
		end: new Date(2025, 3, 10, 19, 0),
		text: "Speakers Rehearsal",
		progress: 100,
		parent: 2,
		type: "task",
		details: "Rehearse presentations and confirm speaker timing.",
	},
	{
		id: 22,
		start: new Date(2025, 3, 10, 19, 0),
		text: "Sound Check",
		progress: 0,
		parent: 2,
		type: "milestone",
		details: "Confirm audio levels and equipment readiness.",
	},
	{
		id: 23,
		start: new Date(2025, 3, 10, 19, 0),
		end: new Date(2025, 3, 10, 22, 0),
		text: "Full Run-through",
		progress: 40,
		parent: 2,
		type: "task",
		details: "Complete end-to-end rehearsal of the conference.",
	},

	{
		id: 3,
		start: new Date(2025, 3, 11, 8, 0),
		end: new Date(2025, 3, 11, 21, 0),
		text: "Conference Day",
		progress: 0,
		parent: 0,
		type: "summary",
		open: true,
		details: "Execute the main event from setup to closing.",
	},
	{
		id: 31,
		start: new Date(2025, 3, 11, 8, 0),
		end: new Date(2025, 3, 11, 12, 0),
		text: "Catering setup",
		progress: 0,
		parent: 3,
		type: "task",
		details: "Arrange food and beverage stations for attendees.",
	},
	{
		id: 32,
		start: new Date(2025, 3, 11, 10, 0),
		end: new Date(2025, 3, 11, 12, 0),
		text: "Tech Check",
		progress: 0,
		parent: 3,
		type: "task",
		details: "Final verification of all technical systems.",
	},
	{
		id: 33,
		start: new Date(2025, 3, 11, 12, 0),
		end: new Date(2025, 3, 11, 16, 0),
		text: "Registration",
		progress: 0,
		parent: 3,
		type: "task",
		details: "Process attendee check-in and distribute materials.",
	},
	{
		id: 34,
		start: new Date(2025, 3, 11, 16, 0),
		end: new Date(2025, 3, 11, 20, 0),
		text: "Main Conference",
		progress: 0,
		parent: 3,
		type: "task",
		details: "Deliver keynotes, talks, and panel sessions.",
	},
	{
		id: 35,
		start: new Date(2025, 3, 11, 20, 0),
		text: "Closing Ceremony",
		progress: 0,
		parent: 3,
		type: "milestone",
		details: "Wrap up the event with closing remarks.",
	},
];

const linksHour = [
	{ id: 1, source: 11, target: 12, type: "e2s" },
	{ id: 2, source: 21, target: 22, type: "e2s" },
	{ id: 3, source: 22, target: 23, type: "e2s" },
	{ id: 4, source: 32, target: 33, type: "e2s" },
	{ id: 5, source: 33, target: 34, type: "e2s" },
	{ id: 6, source: 34, target: 35, type: "e2s" },
];

const scalesHour = [
	{ unit: "day", step: 1, format: "%M %j" },
	{ unit: "hour", step: 1, format: "%H:%i" },
];

const critTasks = [
	{
		id: 10,
		start: new Date(2026, 3, 2),
		end: new Date(2026, 3, 5),
		text: "Marketing analysis",
		progress: 100,
		type: "task",
		details: "Analyze market trends and competitors.",
	},
	{
		id: 11,
		start: new Date(2026, 3, 5),
		end: new Date(2026, 3, 7),
		text: "Discussions",
		progress: 72,
		type: "task",
		open: true,
		details: "Team discussions on project strategies.",
	},
	{
		id: 110,
		start: new Date(2026, 3, 6),
		end: new Date(2026, 3, 9),
		text: "Initial design",
		progress: 60,
		parent: 11,
		type: "task",
		details: "Draft initial design concepts.",
	},
	{
		id: 111,
		start: new Date(2026, 3, 9),
		text: "Presentation",
		progress: 0,
		parent: 11,
		type: "milestone",
		details: "Present initial designs to stakeholders.",
	},
	{
		id: 112,
		start: new Date(2026, 3, 7),
		end: new Date(2026, 3, 12),
		text: "Prototyping",
		progress: 10,
		parent: 11,
		type: "task",
		details: "Build and iterate on early-stage prototypes.",
	},
	{
		id: 113,
		start: new Date(2026, 3, 2),
		end: new Date(2026, 3, 10),
		text: "User testing",
		progress: 0,
		parent: 11,
		type: "task",
		details: "Collect user feedback to improve the design.",
	},

	{
		id: 12,
		start: new Date(2026, 3, 8),
		text: "Approval of strategy",
		progress: 100,
		type: "milestone",
		details: "Sign-off on the agreed project strategy.",
	},
	{
		id: 2,
		start: new Date(2026, 3, 2),
		end: new Date(2026, 3, 12),
		text: "Project management 1",
		progress: 8,
		parent: 0,
		type: "summary",
		open: true,
		details: "Coordinate first-phase resources and deliverables.",
	},
	{
		id: 20,
		start: new Date(2026, 3, 2),
		end: new Date(2026, 3, 6),
		text: "Resource planning",
		progress: 10,
		type: "task",
		parent: 2,
		details: "Identify and allocate team resources and budget.",
	},
	{
		id: 21,
		start: new Date(2026, 3, 6),
		end: new Date(2026, 3, 8),
		text: "Getting approval",
		progress: 10,
		type: "task",
		parent: 2,
		details: "Obtain stakeholder sign-off on the project plan.",
	},
	{
		id: 22,
		start: new Date(2026, 3, 8),
		end: new Date(2026, 3, 10),
		text: "Team introduction",
		progress: 0,
		type: "task",
		parent: 2,
		details: "Onboard team members and align on goals.",
	},
	{
		id: 23,
		start: new Date(2026, 3, 10),
		end: new Date(2026, 3, 12),
		text: "Resource management 1",
		progress: 10,
		type: "task",
		parent: 2,
		details: "Monitor and adjust first-phase resource allocation.",
	},
	{
		id: 24,
		start: new Date(2026, 3, 12),
		text: "Phase 1",
		progress: 100,
		type: "milestone",
		parent: 2,
		details: "Mark successful completion of project phase one.",
	},
	{
		id: 3,
		start: new Date(2026, 3, 2),
		end: new Date(2026, 3, 12),
		text: "Project management 2",
		progress: 8,
		parent: 0,
		type: "summary",
		open: true,
		details: "Coordinate second-phase resources and deliverables.",
	},
	{
		id: 30,
		start: new Date(2026, 3, 2),
		end: new Date(2026, 3, 6),
		text: "Resource planning",
		progress: 10,
		type: "task",
		parent: 3,
		details: "Identify and allocate team resources and budget.",
	},
	{
		id: 31,
		start: new Date(2026, 3, 6),
		end: new Date(2026, 3, 8),
		text: "Getting approval",
		progress: 10,
		type: "task",
		parent: 3,
		details: "Obtain stakeholder sign-off on the project plan.",
	},
	{
		id: 32,
		start: new Date(2026, 3, 8),
		end: new Date(2026, 3, 10),
		text: "Team introduction",
		progress: 0,
		type: "task",
		parent: 3,
		details: "Onboard team members and align on goals.",
	},
	{
		id: 33,
		start: new Date(2026, 3, 10),
		end: new Date(2026, 3, 12),
		text: "Resource management 1",
		progress: 10,
		type: "task",
		parent: 3,
		details: "Monitor and adjust first-phase resource allocation.",
	},
	{
		id: 34,
		start: new Date(2026, 3, 10),
		end: new Date(2026, 3, 12),
		text: "Resource management 2",
		progress: 10,
		type: "task",
		parent: 3,
		details: "Monitor and adjust second-phase resource allocation.",
	},
];

const critLinks = [
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
		source: 23,
		target: 24,
		type: "e2s",
	},
	{
		id: 8,
		source: 30,
		target: 31,
		type: "e2s",
	},
	{
		id: 9,
		source: 31,
		target: 32,
		type: "e2s",
	},
	{
		id: 10,
		source: 32,
		target: 33,
		type: "e2s",
	},
	{
		id: 11,
		source: 32,
		target: 34,
		type: "e2s",
	},
];

export const users = [
	{ id: 1, label: "Laura Turner" },
	{ id: 2, label: "Robert Williams" },
	{ id: 3, label: "Mary Johnson" },
	{ id: 4, label: "John Doe" },
];

function addDays(d, n) {
	return new Date(new Date(d).setDate(d.getDate() + n));
}

export function getData(name, config) {
	const data = datasets[name || "day"];

	if (config?.baselines) {
		data.tasks = data.tasks.map(t => {
			if (!t.base_start) {
				t.base_start = t.start;
				t.base_end = t.end;
				t.base_duration = t.duration;
			}
			return t;
		});
	}
	if (config?.splitTasks) {
		const t = data.tasks.find(t => t.id === 20);
		let { start } = t;

		t.segments = [
			{
				start,
				duration: 1,
				text: "Part A",
			},
			{
				start: addDays(start, name === "calendar" ? 4 : 2),
				duration: 2,
				text: "Part B",
			},
		];
	}
	if (config?.unscheduledTasks) {
		const t = data.tasks.find(t => t.id === 22);
		t.unscheduled = true;
		t.end = new Date(2026, 3, 10);
	}

	return data;
}

const datasets = {
	day: { tasks, links, scales },
	hour: { tasks: tasksHour, links: linksHour, scales: scalesHour },
	critical: { tasks: critTasks, links: critLinks, scales },
	calendar: { tasks: calendarTasks, links, scales },
};

export function getBaselinesData() {
	const t = tasks.map(t => ({
		...t,
		base_start: t.start,
		base_end: t.end,
		base_duration: t.duration,
	}));

	return { tasks: t, links, scales };
}

export function getRollupsData() {
	const data = [...tasks];

	const t = data.map(task => {
		if (!task.base_start) {
			task.base_start = task.start;
			task.base_end = task.end;
			task.base_duration = task.duration;
		}
		if (task.id == 10 || task.id == 11 || task.id == 12 || task.id == 110)
			task.rollup = true;
		return {
			...task,
		};
	});
	return { tasks: t, links, scales };
}

export const taskTypes = [
	{ id: "task", label: "Task" },
	{ id: "summary", label: "Summary task" },
	{ id: "milestone", label: "Milestone" },
	{ id: "urgent", label: "Urgent" },
	{ id: "narrow", label: "Narrow" },
	{ id: "progress", label: "Progress" },
	{ id: "round", label: "Rounded" },
];

export function getTypedData() {
	const t = tasks.map((task, i) => {
		const res = { ...task };
		if (res.type == "task" && i % 3) {
			res.type = taskTypes[(i % 5) + 2].id;
		}
		return res;
	});

	return { tasks: t, links, scales };
}

function hoursTemplate(a, b) {
	return `${format(a, "HH:mm")} - ${format(b, "HH:mm")}`;
}
export const zoomConfig = {
	level: 3,
	levels: [
		{
			minCellWidth: 200,
			maxCellWidth: 400,
			scales: [{ unit: "year", step: 1, format: "%Y" }],
		},
		{
			minCellWidth: 150,
			maxCellWidth: 400,
			scales: [
				{ unit: "year", step: 1, format: "%Y" },
				{ unit: "quarter", step: 1, format: "%Q" },
			],
		},
		{
			minCellWidth: 250,
			maxCellWidth: 350,
			scales: [
				{ unit: "quarter", step: 1, format: "%Q" },
				{ unit: "month", step: 1, format: "%F %Y" },
			],
		},
		{
			minCellWidth: 100,
			scales: [
				{ unit: "month", step: 1, format: "%F %Y" },
				{ unit: "week", step: 1, format: "Week %W" },
			],
		},
		{
			maxCellWidth: 200,
			scales: [
				{ unit: "month", step: 1, format: "%F %Y" },
				{ unit: "day", step: 1, format: "%j", css: dayStyle },
			],
		},
		{
			minCellWidth: 25,
			maxCellWidth: 100,
			scales: [
				{ unit: "day", step: 1, format: "%M %j", css: dayStyle },
				{ unit: "hour", step: 6, format: hoursTemplate },
			],
		},
		{
			maxCellWidth: 120,
			scales: [
				{ unit: "day", step: 1, format: "%M %j", css: dayStyle },
				{ unit: "hour", step: 1, format: "%H:%i" },
			],
		},
	],
};
