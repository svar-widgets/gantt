<script>
	import { getContext } from "svelte";

	const api = getContext("gantt-store");
	const {
		_sCurvePoints: sCurvePoints,
		_chartHeight: chartHeight,
		_scales: scales,
		scrollTop,
	} = api.getReactiveState();

	function lineCss(line) {
		return line.css || `wx-scurve-${line.type}-${line.metric}`;
	}
</script>

{#if $sCurvePoints?.length}
	<svg
		class="wx-scurve"
		style="top:{$scrollTop}px"
		width={$scales.width}
		height={$chartHeight}
	>
		{#each $sCurvePoints as line (line.line)}
			<polyline
				class="wx-scurve-line {lineCss(line)}"
				points={line.path}
			/>
			{#each line.points as p (p.index)}
				<g
					class="wx-scurve-point"
					data-scurve-line={line.line}
					data-scurve-index={p.index}
				>
					<circle class="wx-scurve-hit" cx={p.x} cy={p.y} r="10" />
					<circle
						class="wx-scurve-dot {lineCss(line)}"
						cx={p.x}
						cy={p.y}
						r="4"
					/>
				</g>
			{/each}
		{/each}
	</svg>
{/if}

<style>
	.wx-scurve {
		position: absolute;
		left: 0;
		pointer-events: none;
		overflow: visible;
		z-index: 3;
	}

	.wx-scurve :global(.wx-scurve-scheduled-duration),
	.wx-scurve :global(.wx-scurve-scheduled-progress) {
		color: var(--wx-gantt-scurve-scheduled-color, #ffc975);
		stroke: var(--wx-gantt-scurve-scheduled-color, #ffc975);
		stroke-width: var(--wx-gantt-scurve-scheduled-width, 1);
		stroke-dasharray: var(--wx-gantt-scurve-scheduled-dasharray, none);
	}

	.wx-scurve :global(.wx-scurve-earned-duration),
	.wx-scurve :global(.wx-scurve-earned-progress) {
		color: var(--wx-gantt-scurve-earned-color, #fe6158);
		stroke: var(--wx-gantt-scurve-earned-color, #fe6158);
		stroke-width: var(--wx-gantt-scurve-earned-width, 1);
		stroke-dasharray: var(--wx-gantt-scurve-earned-dasharray, 4 4);
	}

	.wx-scurve :global(.wx-scurve-baseline-duration),
	.wx-scurve :global(.wx-scurve-baseline-progress) {
		color: var(--wx-gantt-scurve-baseline-color, #2c2f3c);
		stroke: var(--wx-gantt-scurve-baseline-color, #2c2f3c);
		stroke-width: var(--wx-gantt-scurve-baseline-width, 1);
		stroke-dasharray: var(--wx-gantt-scurve-baseline-dasharray, 2 2);
	}

	.wx-scurve .wx-scurve-line {
		fill: none;
	}

	.wx-scurve .wx-scurve-hit {
		pointer-events: auto;
		fill: transparent;
	}

	.wx-scurve .wx-scurve-dot {
		pointer-events: none;
		fill: currentColor;
		stroke: var(--wx-background, #fff);
		stroke-width: 1;
		stroke-dasharray: none;
		transform-box: fill-box;
		transform-origin: center;
		transition: transform 0.1s ease-out;
	}

	.wx-scurve .wx-scurve-point:hover .wx-scurve-dot {
		transform: scale(1.5);
	}
</style>
