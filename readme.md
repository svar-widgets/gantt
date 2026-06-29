<div align="center">
	
# SVAR Svelte Gantt Chart

</div>

<div align="center">

[Website](https://svar.dev/svelte/gantt/) • [Getting Started](https://docs.svar.dev/svelte/gantt/getting-started/quickstart/) • [Demos](https://docs.svar.dev/svelte/gantt/samples/#/base/willow)

</div>

<div align="center">

[![npm](https://img.shields.io/npm/v/@svar-ui/svelte-gantt.svg)](https://www.npmjs.com/package/@svar-ui/svelte-gantt)
[![License](https://img.shields.io/github/license/svar-widgets/gantt)](https://github.com/svar-widgets/gantt/blob/main/license.txt)
[![npm downloads](https://img.shields.io/npm/dm/@svar-ui/svelte-gantt.svg)](https://www.npmjs.com/package/@svar-ui/svelte-gantt)

</div>

**SVAR Svelte Gantt** is a customizable, interactive Gantt chart component written in Svelte and designed for visualizing project timelines. It provides an intuitive interface for managing tasks and dependencies directly on the timeline through drag-and-drop scheduling or a customizable task edit form. Comes with full TypeScript support, developer-friendly API, and flexible CSS styling.

The component can be easily integrated with SvelteKit apps - [check the demo](https://github.com/svar-widgets/gantt-demo-sveltekit) and [integration guide](https://docs.svar.dev/svelte/gantt/integration-guides/sveltekit/setup/).

<div align="center">
<img src="https://svar.dev/images/github/basic-gantt-react.gif" alt="SVAR Svelte Gantt UI">
</div>

### Key Features

-   Interactive drag-and-drop interface
-   Tasks and dependencies visualization
-   Intuitive and customizable task edit form
-   Task progress shown on taskbars
-   Configurable timeline with flexible time units
-   Custom time scales: define custom periods like sprints or stages
-   Weekends/holidays highlights
-   Toolbar and context menu
-   Tooltips for taskbars and links
-   Sorting tasks in the grid
-   Filtering (including natural language search)
-   Custom HTML in grid cells
-   Zooming with scroll
-   Hotkeys support for common actions
-   Virtualization for large data sets
-   Localization
-   Light and dark skins
-   Full TypeScript support

### 🚀 PRO Edition

SVAR Svelte Gantt is available in open-source and [PRO editions](https://svar.dev/svelte/gantt/#pro). The PRO edition offers additional features and automation logic:

-   Work day calendars (including individual tasks and resources)
-   Resource planning
-   Resource workload visualization
-   Auto-scheduling (forward mode and Finish-to-Start dependencies)
-   Summary tasks automation
-   Task grouping
-   Critical path
-   Slack visualization
-   Baselines
-   Rollups
-   Split tasks
-   Vertical markers
-   Unscheduled tasks
-   WBS codes support
-   Undo/redo
-   Export to PDF, PNG, Excel
-   MS Project import/export

Visit the [pricing page](https://svar.dev/svelte/gantt/pricing/) for full feature comparison, licensing details, and **free trial**.

👉 [Check the live demo](https://svar.dev/demos/gantt/) to see SVAR Svelte Gantt chart in action.


### 🔧 Svelte 4 and Svelte 5 versions

There are two versions of the library: the 1.x version – designed to work with Svelte 4, and the 2.x version – created for Svelte 5 and is actively maintained.

To use the SVAR Gantt for Svelte 5, install it as follows:

```
npm install @svar-ui/svelte-gantt
```

To use the SVAR Gantt for Svelte 4:

```
npm install wx-svelte-gantt@1.2.0
```

### 🛠️ How to Use

To use SVAR Svelte Gantt, simply import the package and include the component in your Svelte file:

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

For further instructions, follow the detailed [how-to-start guide](https://docs.svar.dev/svelte/gantt/getting-started/quickstart/).

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

If SVAR Svelte Gantt helps your project, give us a star! It helps us reach more developers and keeps us motivated to add new features.

### :speech_balloon: Need Help?

[Post an Issue](https://github.com/svar-widgets/gantt/issues/) or use our [community forum](https://forum.svar.dev).
