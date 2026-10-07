import { describe, test, expect } from "vitest";
import {
	resolveLayout,
	resolveGridDrag,
	resolveSubGridDrag,
	DEFAULT_COMPACT_WIDTH,
	DEFAULT_MIN_CHART_WIDTH,
	DEFAULT_MIN_CHART_WITH_SUBGRID,
	DEFAULT_MIN_SUBGRID_WIDTH,
	resolvePanelChange,
	getResizerWidth,
	type TResolveLayoutState,
} from "../src/layout/panels";
import {
	normalizeDisplayMode,
	toCompactPanels,
	toggleGridChart,
	toggleChartSubGrid,
} from "../src/layout/displayMode";

const COLLAPSE_THRESHOLD = 37;

const LAYOUT_DEFAULTS: TResolveLayoutState = {
	displayMode: ["grid", "chart", "subGrid"],
	_displayPanels: ["grid", "chart", "subGrid"],
	_compactMode: false,
	gridWidth: 440,
	subGridWidth: 226,
	_containerWidth: null,
	columns: [
		{ id: "text", header: "Task", width: 200, section: "grid" },
		{ id: "status", header: "Status", width: 100, section: "subGrid" },
	],
};

const FIT = {
	ganttWidth: 1000,
	gridWidth: 400,
	subGridWidth: 200,
	hasSubGrid: true,
	collapseThreshold: COLLAPSE_THRESHOLD,
};
const TIGHT = {
	...FIT,
	ganttWidth: 690,
	gridWidth: 440,
	subGridWidth: 226,
};
const WIDE_SUB = { ...FIT, subGridWidth: 300 };

describe("layout/panels", () => {
	test("compact uses fixed 650 breakpoint, chart min is only for full mode", () => {
		expect(DEFAULT_COMPACT_WIDTH).to.eq(650);
		expect(DEFAULT_MIN_CHART_WIDTH).to.eq(100);
		expect(DEFAULT_MIN_CHART_WITH_SUBGRID).to.eq(360);
		expect(DEFAULT_MIN_SUBGRID_WIDTH).to.eq(37);
		expect(resolveLayout(LAYOUT_DEFAULTS, { width: null }).compactMode).to
			.be.true;
		expect(resolveLayout(LAYOUT_DEFAULTS, { width: 650 }).compactMode).to.be
			.true;
		expect(resolveLayout(LAYOUT_DEFAULTS, { width: 651 }).compactMode).to.be
			.false;
	});

	test("compact toggles update display panels", () => {
		expect(toggleGridChart(["grid"], "start", true)).to.deep.eq(["chart"]);
		expect(toggleGridChart(["chart"], "end", true)).to.deep.eq(["grid"]);
		expect(toggleGridChart(["subGrid"], "start", true)).to.deep.eq([
			"grid",
		]);
		expect(toggleChartSubGrid(["chart"], "end", true)).to.deep.eq([
			"subGrid",
		]);
		expect(toggleChartSubGrid(["subGrid"], "start", true)).to.deep.eq([
			"chart",
		]);
		expect(
			normalizeDisplayMode(["grid", "chart", "subGrid"], true)
		).to.deep.eq(["grid", "chart", "subGrid"]);
		expect(normalizeDisplayMode(["grid", "subGrid"], true)).to.deep.eq([
			"grid",
			"subGrid",
		]);
		expect(normalizeDisplayMode(["subGrid"], true)).to.deep.eq(["subGrid"]);
		expect(
			normalizeDisplayMode(["grid", "chart", "subGrid"], false)
		).to.deep.eq(["grid", "chart"]);
		expect(normalizeDisplayMode(["subGrid"], false)).to.deep.eq([
			"grid",
			"chart",
		]);
		expect(normalizeDisplayMode([], true)).to.deep.eq([
			"grid",
			"chart",
			"subGrid",
		]);
		expect(normalizeDisplayMode([], false)).to.deep.eq(["grid", "chart"]);
	});

	test("toCompactPanels uses a single-panel preference as-is", () => {
		expect(toCompactPanels(["chart"], ["grid"])).to.deep.eq(["chart"]);
		expect(toCompactPanels(["grid"], ["chart"])).to.deep.eq(["grid"]);
		expect(toCompactPanels(["subGrid"], ["chart"])).to.deep.eq(["subGrid"]);
	});

	test("toCompactPanels keeps the current view when preference is multi-panel", () => {
		expect(
			toCompactPanels(["grid", "chart", "subGrid"], ["chart"])
		).to.deep.eq(["chart"]);
		expect(
			toCompactPanels(["grid", "chart"], ["grid", "chart"])
		).to.deep.eq(["grid"]);
		expect(toCompactPanels(["chart", "subGrid"], ["grid"])).to.deep.eq([
			"chart",
		]);
	});

	test("full toggle expands grid/chart without forcing subGrid", () => {
		expect(toggleGridChart(["chart"], "end")).to.deep.eq(["grid", "chart"]);
		expect(toggleGridChart(["chart", "subGrid"], "end")).to.deep.eq([
			"grid",
			"chart",
			"subGrid",
		]);
		expect(toggleGridChart(["grid"], "start")).to.deep.eq([
			"grid",
			"chart",
		]);
		expect(
			toggleGridChart(["grid", "chart", "subGrid"], "start")
		).to.deep.eq(["chart", "subGrid"]);
		expect(toggleGridChart(["grid", "chart"], "start")).to.deep.eq([
			"chart",
		]);
		expect(toggleGridChart(["grid", "chart", "subGrid"], "end")).to.deep.eq(
			["grid"]
		);
		expect(toggleGridChart(["grid", "subGrid"], "end")).to.deep.eq([
			"grid",
			"chart",
			"subGrid",
		]);
		expect(toggleGridChart(["grid", "subGrid"], "start")).to.deep.eq([
			"chart",
			"subGrid",
		]);
	});

	test("chart/subGrid toggle collapses either side", () => {
		expect(
			toggleChartSubGrid(["grid", "chart", "subGrid"], "start")
		).to.deep.eq(["grid", "subGrid"]);
		expect(
			toggleChartSubGrid(["grid", "chart", "subGrid"], "end")
		).to.deep.eq(["grid", "chart"]);
		expect(toggleChartSubGrid(["grid", "subGrid"], "start")).to.deep.eq([
			"grid",
			"chart",
			"subGrid",
		]);
		expect(toggleChartSubGrid(["grid", "subGrid"], "end")).to.deep.eq([
			"grid",
			"chart",
			"subGrid",
		]);
		expect(toggleChartSubGrid(["grid", "chart"], "end")).to.deep.eq([
			"grid",
			"chart",
			"subGrid",
		]);
		expect(toggleChartSubGrid(["chart", "subGrid"], "start")).to.deep.eq([
			"subGrid",
		]);
		expect(toggleChartSubGrid(["subGrid"], "start")).to.deep.eq([
			"chart",
			"subGrid",
		]);
	});

	test("resolveLayout: entering compact resets display panels to grid", () => {
		const result = resolveLayout(
			{ ...LAYOUT_DEFAULTS, _compactMode: false, _containerWidth: 800 },
			{ width: 400 }
		);
		expect(result.compactMode).to.be.true;
		expect(result.displayPanels).to.deep.eq(["grid"]);
	});

	test("resolveLayout: compact exit restores preference when it fits", () => {
		const result = resolveLayout(
			{
				...LAYOUT_DEFAULTS,
				_compactMode: true,
				_displayPanels: ["grid"],
				_containerWidth: 400,
				gridWidth: 237,
				subGridWidth: 83,
			},
			{ width: 900 }
		);
		expect(result.compactMode).to.be.false;
		expect(result.displayPanels).to.deep.eq(["grid", "chart", "subGrid"]);
		expect(result.gridWidth).to.eq(237);
		expect(result.subGridWidth).to.eq(83);
	});

	test("resolveLayout: compact exit drops subGrid rather than shrinking grid", () => {
		const result = resolveLayout(
			{
				...LAYOUT_DEFAULTS,
				_compactMode: true,
				_displayPanels: ["grid"],
				_containerWidth: 400,
			},
			{ width: 654 }
		);
		expect(result.compactMode).to.be.false;
		expect(result.displayPanels).to.deep.eq(["grid", "chart"]);
		expect(result.gridWidth).to.eq(440);
		expect(result.subGridWidth).to.eq(226);
	});

	test("resolveLayout: does not shrink grid to keep subGrid", () => {
		const result = resolveLayout(
			{
				...LAYOUT_DEFAULTS,
				_containerWidth: 1000,
				gridWidth: 600,
				subGridWidth: 200,
			},
			{ width: 1000 }
		);
		// 1000 - 600 - 200 - 8 = 192 < 360. Shrinking grid would fit all three.
		expect(result.displayPanels).to.deep.eq(["grid", "chart"]);
		expect(result.gridWidth).to.eq(600);
		expect(result.subGridWidth).to.eq(200);
	});

	test("resolveLayout: shrinks grid after subGrid collapse to keep chart", () => {
		const result = resolveLayout(
			{
				...LAYOUT_DEFAULTS,
				_containerWidth: 900,
				gridWidth: 796,
				subGridWidth: 226,
			},
			{ width: 900 }
		);
		expect(result.displayPanels).to.deep.eq(["grid", "chart"]);
		expect(result.subGridWidth).to.eq(226);
		expect(result.gridWidth).to.be.lessThan(796);
		expect(900 - result.gridWidth - 8).to.eq(DEFAULT_MIN_CHART_WIDTH);
	});

	test("resolveGridDrag: drops subGrid then chart; min strip collapses grid", () => {
		const measure = {
			ganttWidth: 800,
			subGridWidth: 226,
			hasSubGrid: true,
			collapseThreshold: COLLAPSE_THRESHOLD,
		};
		const dropSub = resolveGridDrag(["grid", "chart", "subGrid"], {
			...measure,
			gridWidth: 500,
		});
		expect(dropSub.panels).to.deep.eq(["grid", "chart"]);
		expect(dropSub.subGridWidth).to.eq(226);
		expect(800 - dropSub.gridWidth - 8).to.eq(292);

		const dropChart = resolveGridDrag(["grid", "chart", "subGrid"], {
			...measure,
			gridWidth: 720,
		});
		expect(dropChart.panels).to.deep.eq(["grid"]);

		const minStrip = resolveGridDrag(["grid", "chart", "subGrid"], {
			...measure,
			gridWidth: COLLAPSE_THRESHOLD,
			preferredGridWidth: 440,
		});
		expect(minStrip.panels).to.deep.eq(["chart", "subGrid"]);
		expect(minStrip.gridWidth).to.eq(440);

		const fromGridSub = resolveGridDrag(["grid", "subGrid"], {
			...measure,
			gridWidth: COLLAPSE_THRESHOLD,
		});
		expect(fromGridSub.panels).to.deep.eq(["chart", "subGrid"]);
	});

	test("getResizerWidth: two dividers only with chart and subGrid columns", () => {
		expect(getResizerWidth(false)).to.eq(4);
		expect(getResizerWidth(true)).to.eq(4);
		expect(getResizerWidth(true, ["grid"])).to.eq(4);
		expect(getResizerWidth(true, ["grid", "subGrid"])).to.eq(4);
		expect(getResizerWidth(true, ["grid", "chart"])).to.eq(8);
		expect(getResizerWidth(true, ["grid", "chart", "subGrid"])).to.eq(8);
	});

	test("resolveGridDrag: without chart keeps subGrid preference until collapse", () => {
		const measure = {
			ganttWidth: 800,
			subGridWidth: 226,
			hasSubGrid: true,
			collapseThreshold: COLLAPSE_THRESHOLD,
		};
		const moved = resolveGridDrag(["grid", "subGrid"], {
			...measure,
			gridWidth: 600,
		});
		expect(moved.panels).to.deep.eq(["grid", "subGrid"]);
		expect(moved.subGridWidth).to.eq(226);

		const collapsed = resolveGridDrag(["grid", "subGrid"], {
			...measure,
			gridWidth: 780,
		});
		expect(collapsed.panels).to.deep.eq(["grid"]);
		expect(collapsed.subGridWidth).to.eq(226);

		const afterEroded = resolveGridDrag(["grid", "subGrid"], {
			...measure,
			gridWidth: 780,
			subGridWidth: DEFAULT_MIN_SUBGRID_WIDTH,
		});
		expect(afterEroded.subGridWidth).to.eq(DEFAULT_MIN_SUBGRID_WIDTH);
	});

	test("resolveSubGridDrag: grows into chart, then expands or closes at min strip", () => {
		const keep = resolveSubGridDrag(["grid", "chart", "subGrid"], {
			...FIT,
		});
		expect(keep.panels).to.deep.eq(["grid", "chart", "subGrid"]);
		expect(keep.subGridWidth).to.eq(200);

		const dropChart = resolveSubGridDrag(["grid", "chart", "subGrid"], {
			...WIDE_SUB,
		});
		expect(dropChart.panels).to.deep.eq(["grid", "subGrid"]);
		expect(dropChart.subGridWidth).to.eq(300);

		const expandKeepWidth = resolveSubGridDrag(
			["grid", "chart", "subGrid"],
			{ ...WIDE_SUB, preferredSubGridWidth: 200 }
		);
		expect(expandKeepWidth.panels).to.deep.eq(["grid", "subGrid"]);
		expect(expandKeepWidth.subGridWidth).to.eq(200);

		const collapsedGrid = resolveSubGridDrag(["chart", "subGrid"], {
			...FIT,
			gridWidth: 440,
		});
		expect(collapsedGrid.panels).to.deep.eq(["chart", "subGrid"]);

		// Collapsed grid at 880px: coexistence does not reopen the grid.
		const collapsedGrow = resolveSubGridDrag(["chart", "subGrid"], {
			ganttWidth: 880,
			gridWidth: 440,
			subGridWidth: 500,
			hasSubGrid: true,
			collapseThreshold: COLLAPSE_THRESHOLD,
			preferredSubGridWidth: 200,
		});
		expect(collapsedGrow.panels).to.deep.eq(["chart", "subGrid"]);
		expect(collapsedGrow.subGridWidth).to.eq(500);
		expect(880 - COLLAPSE_THRESHOLD - 500 - 8).to.be.lessThan(
			DEFAULT_MIN_CHART_WITH_SUBGRID
		);

		const collapsedExpand = resolveSubGridDrag(["chart", "subGrid"], {
			ganttWidth: 880,
			gridWidth: 440,
			subGridWidth: 750,
			hasSubGrid: true,
			collapseThreshold: COLLAPSE_THRESHOLD,
			preferredSubGridWidth: 200,
		});
		expect(collapsedExpand.panels).to.deep.eq(["subGrid"]);
		expect(collapsedExpand.subGridWidth).to.eq(200);

		const close = resolveSubGridDrag(["grid", "subGrid"], {
			ganttWidth: 800,
			gridWidth: 400,
			subGridWidth: DEFAULT_MIN_SUBGRID_WIDTH,
			hasSubGrid: true,
			collapseThreshold: COLLAPSE_THRESHOLD,
		});
		expect(close.panels).to.deep.eq(["grid"]);
		expect(close.subGridWidth).to.eq(DEFAULT_MIN_SUBGRID_WIDTH);

		const closeKeep = resolveSubGridDrag(["grid", "chart", "subGrid"], {
			...FIT,
			subGridWidth: DEFAULT_MIN_SUBGRID_WIDTH,
			preferredSubGridWidth: 200,
		});
		expect(closeKeep.panels).to.deep.eq(["grid", "chart"]);
		expect(closeKeep.subGridWidth).to.eq(200);
	});

	test("resolvePanelChange: last-added panel wins when they cannot coexist", () => {
		const all = ["grid", "chart", "subGrid"] as const;

		expect(
			resolvePanelChange(["grid", "subGrid"], [...all], WIDE_SUB)
		).to.deep.eq(["grid", "chart"]);
		expect(
			resolvePanelChange(["grid", "subGrid"], [...all], FIT)
		).to.deep.eq([...all]);
		expect(resolvePanelChange(["grid"], [...all], TIGHT)).to.deep.eq([
			"grid",
			"chart",
		]);
		expect(
			resolvePanelChange(["grid", "chart"], [...all], TIGHT)
		).to.deep.eq(["grid", "subGrid"]);
		expect(resolvePanelChange(["grid", "chart"], [...all], FIT)).to.deep.eq(
			[...all]
		);

		expect(
			resolvePanelChange(["chart"], ["chart", "subGrid"], FIT)
		).to.deep.eq(["chart", "subGrid"]);
		expect(
			resolvePanelChange(["chart"], ["chart", "subGrid"], {
				...FIT,
				ganttWidth: 500,
			})
		).to.deep.eq(["grid", "subGrid"]);
		expect(
			resolvePanelChange(["grid", "subGrid"], ["chart", "subGrid"], TIGHT)
		).to.deep.eq(["chart", "subGrid"]);
	});

	test("resolveLayout: scrollSize can drop subGrid when chart falls below coexistence floor", () => {
		const state = {
			...LAYOUT_DEFAULTS,
			_containerWidth: 1000,
			gridWidth: 400,
			subGridWidth: 200,
		};
		expect(
			resolveLayout(state, { width: 1000, scrollSize: 0 }).displayPanels
		).to.be.undefined;
		expect(
			resolveLayout(state, { width: 1000, scrollSize: 33 }).displayPanels
		).to.deep.eq(["grid", "chart"]);
	});

	test("resolveLayout: auto-hidden subGrid returns on widen; explicit close does not", () => {
		const autoHidden = {
			...LAYOUT_DEFAULTS,
			_containerWidth: 690,
			_displayPanels: ["grid", "chart"],
			gridWidth: 440,
			subGridWidth: 226,
		};
		expect(resolveLayout(autoHidden, { width: 690 }).displayPanels).to.be
			.undefined;
		expect(
			resolveLayout(autoHidden, { width: 1200 }).displayPanels
		).to.deep.eq(["grid", "chart", "subGrid"]);

		const userClosed = {
			...autoHidden,
			displayMode: ["grid", "chart"],
		};
		expect(resolveLayout(userClosed, { width: 1200 }).displayPanels).to.be
			.undefined;
	});

	test("resolveLayout: does not restore chart after user opened subGrid in a tight window", () => {
		const result = resolveLayout(
			{
				...LAYOUT_DEFAULTS,
				displayMode: ["grid", "subGrid"],
				_displayPanels: ["grid", "subGrid"],
				_containerWidth: 690,
			},
			{ width: 1200 }
		);
		expect(result.displayPanels).to.be.undefined;
		expect(result.gridWidth).to.eq(440);
		expect(result.subGridWidth).to.eq(226);
	});
});
