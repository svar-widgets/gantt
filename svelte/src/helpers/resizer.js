/** @param {"gridChart" | "subGrid"} role */
export function getResizerUi(role, panels, compactMode = false) {
	if (role === "subGrid") {
		// Layout mounts this resizer only while chart is open; grid+subGrid
		// restore chart via the grid/chart resizer instead.
		const subGridVisible = panels.includes("subGrid");
		const chartVisible = panels.includes("chart");
		const bothVisible = subGridVisible && chartVisible;

		return {
			layout: subGridVisible || compactMode ? "both" : "collapsed",
			// Full mode only: compact shows chart OR subGrid (toggle via buttons).
			draggable: bothVisible,
			hideButtonsUntilHover: bothVisible && !compactMode,
			startButton: {
				icon: "left",
				side: "left",
				visible:
					bothVisible ||
					(!subGridVisible && (chartVisible || compactMode)),
			},
			endButton: {
				icon: "right",
				side: "right",
				// Full: collapse subGrid when both open. Compact: flip chart↔subGrid.
				visible: bothVisible || compactMode,
			},
		};
	}

	const hasGrid = panels.includes("grid");
	const hasChart = panels.includes("chart");
	const hasSubGrid = panels.includes("subGrid");
	const gridChartFull = hasGrid && hasChart;
	const gridSubGridOnly = hasGrid && hasSubGrid && !hasChart;
	const layout =
		gridChartFull || gridSubGridOnly ? "both" : hasGrid ? "start" : "end";

	return {
		layout,
		draggable: !compactMode && (gridChartFull || gridSubGridOnly),
		hideButtonsUntilHover: gridChartFull,
		startButton: {
			icon: "left",
			side: "left",
			visible: hasGrid,
		},
		endButton: {
			icon: "right",
			side: "right",
			// Chart open, grid collapsed, or grid+subGrid (restore chart, keep grid)
			visible: hasChart || !hasGrid || gridSubGridOnly,
		},
	};
}
