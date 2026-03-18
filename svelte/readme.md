<div align="center">
	
# SVAR Svelte Gantt Chart

</div>

<div align="center">

[Website](https://svar.dev/svelte/gantt/) • [Getting Started](https://docs.svar.dev/svelte/gantt/getting_started/) • [Demos](https://docs.svar.dev/svelte/gantt/samples/#/base/willow)

</div>

<div align="center">

[![npm](https://img.shields.io/npm/v/@svar-ui/svelte-gantt.svg)](https://www.npmjs.com/package/@svar-ui/svelte-gantt)
[![License](https://img.shields.io/github/license/svar-widgets/gantt)](https://github.com/svar-widgets/gantt/blob/main/license.txt)
[![npm downloads](https://img.shields.io/npm/dm/@svar-ui/svelte-gantt.svg)](https://www.npmjs.com/package/@svar-ui/svelte-gantt)
[![Last Commit](https://img.shields.io/github/last-commit/svar-widgets/gantt)](https://github.com/svar-widgets/gantt)

</div>

[SVAR Svelte Gantt](https://svar.dev/svelte/gantt/) is a customizable, interactive Gantt chart component written in Svelte and designed for visualizing project timelines. The component provides an intuitive interface for managing tasks and dependencies directly on the timeline via drag-and-drop or a customizable task edit form. Comes with full Typescript support, developer-friendly API, and flexible CSS styling.

<div align="center">
<img src="https://svar.dev/images/github/basic-gantt-react.gif" alt="SVAR Svelte Gantt UI">
</div>

### :sparkles: Key Features

Core features designed for flexible and interactive project timeline management:

-   Interactive drag-and-drop interface
-   Intuitive and customizable task edit form
-   Task dependencies
-   Task progress shown on a taskbar
-   Hierarchical view of sub tasks
-   Configurable timeline with flexible time units
-   Custom time scales: define custom periods like sprints or stages
-   Weekends/holidays highlights
-   Custom HTML in grid cells
-   Toolbar and context menu
-   Tooltips for taskbars
-   Sorting tasks in grid
-   Filtering (including natural language search)
-   Zooming with scroll
-   Hotkeys support for common actions
-   Fast performance with large data sets
-   Localization
-   Light and dark skins
-   Full TypeScript support

### 🚀 PRO Edition

SVAR Svelte Gantt is available in open-source and [PRO Editions](https://svar.dev/svelte/gantt/#pro). The PRO Edition offers additional features and automation logic:

-   Work days calendar
-   Auto-scheduling (forward mode and Finish-to-Start dependencies)
-   Summary tasks automation
-   Critical path
-   Slack visualization
-   Baselines
-   Rollups
-   Split tasks
-   Vertical markers
-   Unscheduled tasks
-   Undo/redo
-   Export to PDF, PNG, Excel
-   MS Project import/export

Visit the [pricing page](https://svar.dev/svelte/gantt/pricing/) for full feature comparison, licensing details, and **free trial**, or [see the live demo](https://svar.dev/demos/gantt/).

### :hammer_and_wrench: How to Use

To use the Gantt chart, simply import the package and include the component in your Svelte file:

```svelte
<script>
	import { Gantt } from "@svar-ui/svelte-gantt";

	const tasks = [
		{
			id: 1,
			start: new Date(2024, 3, 2),
			end: new Date(2024, 3, 17),
			text: "Project planning",
			progress: 30,
			parent: 0,
			type: "summary",
			open: true,
			details: "Outline the project's scope and resources.",
		},
	];
	const links = [];
	const scales = [
		{ unit: "month", step: 1, format: "%F %Y" },
		{ unit: "day", step: 1, format: "%j", css: dayStyle },
	];
</script>

<Gantt {tasks} {links} {scales} />
```

For further instructions, follow the detailed [how-to-start guide](https://docs.svar.dev/svelte/gantt/getting_started/).

### How to Modify

Typically, you don't need to modify the code. However, if you wish to do so, follow these steps:

1. Run `yarn` to install dependencies. Note that this project is a monorepo using `yarn` workspaces, so npm will not work
2. Start the project in development mode with `yarn start`

### Run Tests

To run the test:

1. Start the test examples with:
    ```sh
    yarn start:tests
    ```
2. In a separate console, run the end-to-end tests with:
    ```sh
    yarn test:cypress
    ```

### ⭐ Show Your Support

If SVAR Svelte Gantt helps your project, [give us a star](https://github.com/svar-widgets/gantt)! It helps us reach more developers and keeps us motivated to add new features.

### :speech_balloon: Need Help?

Join our [community forum](https://forum.svar.dev) to get help and submit feature requests.
