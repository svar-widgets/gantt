<script>
	import { getData } from "../data";
	import { Gantt } from "../../src/";

	let { skinSettings } = $props();

	const data = getData();
</script>

<div style="padding: 20px;">
	<h2>连线删除功能测试</h2>
	<p>点击连线可以选中它，选中的连线会显示删除按钮。点击删除按钮可以删除连线。</p>
	
	<Gantt
		{...skinSettings}
		tasks={data.tasks}
		links={data.links}
		scales={data.scales}
	/>
</div>
