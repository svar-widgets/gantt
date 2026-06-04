<script>
	import { getValue } from "@svar-ui/grid-store";
	import { setID } from "@svar-ui/lib-dom";

	let { row, column } = $props();
</script>

<div data-resource-id={setID(row.id)}>
	{column.template(getValue(row, column))}
</div>
