<div align="center">
	
# SVAR Svelte Gantt Chart

</div>

<div align="center">

:globe_with_meridians: [Website](https://svar.dev/svelte/gantt/) • :bulb: [Getting Started](https://docs.svar.dev/svelte/gantt/getting_started/) • :eyes: [Demos](https://docs.svar.dev/svelte/gantt/samples/#/base/willow)

</div>

<div align="center">

[![npm](https://img.shields.io/npm/v/wx-svelte-gantt.svg)](https://www.npmjs.com/package/wx-svelte-gantt)
[![License](https://img.shields.io/github/license/svar-widgets/gantt)](https://github.com/svar-widgets/gantt/blob/main/license.txt)
[![npm downloads](https://img.shields.io/npm/dm/wx-svelte-gantt.svg)](https://www.npmjs.com/package/wx-svelte-gantt)

</div>

SVAR Svelte Gantt is a customizable, easy-to-use, and interactive Gantt chart component written in Svelte. Its intuitive interface allows users to add and manage tasks and dependencies directly on the timeline using drag-and-drop or via a simple task edit form.

<div align="center">
  <img src="https://cdn.svar.dev/public/gantt-chart-ui.png" alt="UI of SVAR Svelte Gantt Chart - Screenshot">
</div>

### Svelte 4 and Svelte 5 versions

There are two versions of the library: the 1.x version, designed to work with Svelte 4, and the 2.x version, created for Svelte 5. Please note that the 2.x version is in beta and may contain some instabilities.

To use the SVAR Gantt beta for Svelte 5, install it as follows:

```
npm install wx-svelte-gantt
```

To use the SVAR Gantt for Svelte 4:

```
npm install wx-svelte-gantt@1.2.0
```

### ✨ Key Features

-   Interactive drag-and-drop interface
-   Intuitive and customizable task edit form
-   Set task dependencies on the timeline or in a popup form
-   Hierarchical view of sub tasks
-   Reordering tasks in grid with drag-and-drop
-   Configurable timeline (hours, days, weeks)
-   Zooming with scroll
-   Showing task progress on the taskbar
-   Toolbar and context menu
-   Tooltips for taskbars
-   Fast performance with big data sets

### 🛠️ How to Use

To use the widget, simply import the package and include the component in your Svelte file:

```svelte
<script>
	import { Gantt } from "wx-svelte-gantt";

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
		{ unit: "month", step: 1, format: "MMMM yyy" },
		{ unit: "day", step: 1, format: "d", css: dayStyle },
	];
</script>

<Gantt {tasks} {links} {scales} />
```

For further instructions, follow the detailed [how-to-start guide](https://docs.svar.dev/svelte/gantt/getting_started/).

### 💻 How to Modify

Typically, you don't need to modify the code. However, if you wish to do so, follow these steps:

1. Run `yarn` to install dependencies. Note that this project is a monorepo using `yarn` workspaces, so npm will not work
2. Start the project in development mode with `yarn start`

### ✅ Run Tests

To run the test:

1. Start the test examples with:
    ```sh
    yarn start:tests
    ```
2. In a separate console, run the end-to-end tests with:
    ```sh
    yarn test:cypress
    ```

### :speech_balloon: Need Help?

[Post an Issue](https://github.com/svar-widgets/gantt/issues/) or use our [community forum](https://forum.svar.dev).
