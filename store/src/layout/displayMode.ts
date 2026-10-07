import type { IGanttColumn, TDisplayModeConfig, TDisplayPanel } from "../types";
import { getColumnsBySection } from "../columns";
import { isCommunity } from "../package";

export function hasSubGridColumns(columns?: IGanttColumn[]): boolean {
	return false;
}

// User preference, independent of compact.
export function normalizeDisplayMode(
	mode: TDisplayModeConfig | undefined,
	hasSubGrid: boolean
): TDisplayPanel[] {
	const all: TDisplayPanel[] = ["grid", "chart"];

	let panels: TDisplayPanel[];

	if (Array.isArray(mode)) {
		panels = [...mode];
	} else {
		switch (mode) {
			case "grid":
			case "chart":
				panels = [mode];
				break;
			case "all":
			default:
				panels = all;
				break;
		}
	}
	if (!hasSubGrid) panels = panels.filter(panel => panel !== "subGrid");

	if (!panels.length) panels = all;

	return panels;
}

// One panel. Keep current if still in the preference, else grid.
export function toCompactPanels(
	mode: TDisplayPanel[],
	current?: TDisplayPanel[] | null
): TDisplayPanel[] {
	if (mode.length <= 1) return mode.length ? mode : ["grid"];
	const shown = current?.find(panel => mode.includes(panel));
	if (shown) return [shown];
	if (mode.includes("grid")) return ["grid"];
	return [mode[0]];
}

// Compact: flip grid↔chart. Full: side-aware.
export function toggleGridChart(
	panels: TDisplayPanel[],
	side: "start" | "end",
	compact = false
): TDisplayPanel[] {
	if (compact) return panels.includes("grid") ? ["chart"] : ["grid"];

	const hasGrid = panels.includes("grid");
	const hasChart = panels.includes("chart");
	const hasSubGrid = panels.includes("subGrid");

	if (!(hasGrid && hasChart)) {
		return ["grid", "chart"];
	}
	if (side === "start") {
		return ["chart"];
	}
	return ["grid"];
}

// Compact: flip chart↔subGrid. Full: side-aware.
export function toggleChartSubGrid(
	panels: TDisplayPanel[],
	side: "start" | "end",
	compact = false
): TDisplayPanel[] {
	if (isCommunity()) return panels;
}
