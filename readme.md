### :star: SVAR Gantt for Svelte

SVAR Gantt provides ready to use control for file uploading

### :link: Useful Links

-   [Documentation](https://docs.svar.dev/svelte/gantt/overview)
-   [How to start guide](https://docs.svar.dev/svelte/gantt/getting_started/)
-   [Demos](https://docs.svar.dev/svelte/gantt/samples/#/base/willow)

### :page_with_curl: License

SVAR Gantt for Svelte is available under GPLv3 license.

### How to Use

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
			type: "project",
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
