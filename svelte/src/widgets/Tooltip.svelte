<script>
	import { Tooltip } from "@svar-ui/svelte-core";
	import { getID, locateID } from "@svar-ui/lib-dom";

	let {
		api,
		at = "point",
		overflow = false,
		content: Content,
		resolver = defaultResolver,
		...restProps
	} = $props();

	function defaultResolver(element, ev) {
		if (!api) return null;

		// (1) Match against tasks / segments
		const taskId = getID(element, "data-task-id");
		if (taskId) {
			const task = api.getTask(taskId);
			if (!task) return null;
			if (overflow) {
				const node = element.querySelector(".wx-content");
				if (node && node.scrollWidth <= node.clientWidth) return null;
			}
			const segmentIndex = locateID(ev.target, "data-segment");
			if (Content) {
				return { api, data: { task, segmentIndex } };
			} else {
				if (segmentIndex !== null) {
					return task.segments?.[segmentIndex]?.text ?? "";
				} else {
					return task.text ?? "";
				}
			}
		}

		// (2) Match against links
		const linkId = getID(element, "data-link-id");
		if (linkId) {
			const state = api.getState();
			const link = state.links.byId(linkId);
			if (!link) return null;
			if (Content) {
				return { api, data: { link } };
			} else {
				return null;
			}
		}

		// (3) Match against rollups
		const rollupId = getID(element, "data-rollup-id");
		if (rollupId) {
			const task = api.getTask(rollupId);
			if (!task) return null;
			if (Content) {
				return { api, data: { rollup: task } };
			} else {
				return task.text ?? "";
			}
		}

		// (4) Match against resources
		const resourceId = getID(element, "data-resource-id");
		if (resourceId) {
			const resource = api.getResource(resourceId);
			if (!resource) return null;
			if (Content) {
				return {
					api,
					data: { resource },
				};
			} else {
				return resource.name ?? "";
			}
		}

		// (5) No match, continue
		return null;
	}
</script>

<Tooltip {at} content={Content} {resolver} {...restProps} />
