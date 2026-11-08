<script lang="ts">
	import { getValue } from "@svar-ui/grid-store";
	import type { IColumn } from "@svar-ui/grid-store";
	import { setID } from "@svar-ui/lib-dom";
	import type { IComputedResource } from "@svar-ui/gantt-store";

	type Props = {
		row: IComputedResource;
		column: IColumn & { template: (value: any) => string };
	};

	let { row, column }: Props = $props();
</script>

<div data-resource-id={setID(row.id)}>
	{column.template(getValue(row, column))}
</div>
