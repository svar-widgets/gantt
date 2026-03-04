import { test, expect, describe, beforeEach, vi, afterEach } from "vitest";
import { DataStore } from "../src/index";
import { getData, unitFormats } from "./stubs/data";
import { writable } from "./stubs/writable";

import { normalizeZoom } from "../src/scales";
import { parseTaskDates } from "../src/normalizeDates";

let store: DataStore;

function resetState(data?: any) {
	if (!data) data = getData();
	parseTaskDates(data.tasks, { durationUnit: "day" });
	store = new DataStore(writable);

	store.init({ ...data });
}

beforeEach(() => {
	vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
	vi.useRealTimers();
});

function zoomWidths(
	initialWidth: number,
	level: number,
	times: number,
	factor: number,
	min: number,
	max: number
): any {
	const widths = [];
	let curLevel = level;
	for (let i = 0, width = initialWidth; i < times; i++) {
		width = Math.round(width * factor);
		if (width > max) {
			curLevel++;
			width = min;
		} else if (width < min) {
			width = max;
			curLevel--;
		}
		widths.push({ width, level: curLevel });
	}
	return widths;
}

describe("datastore", () => {
	describe("zoom-chart", () => {
		const zoomSteps = 20;
		const offset = 400;
		const minCellWidth = 50;
		const maxCellWidth = 300;

		test("can zoom in", () => {
			const data = getData("full");
			const config = normalizeZoom(true, unitFormats, data.scales, 100);
			resetState({ ...data, ...config });
			let { zoom, cellWidth } = store.getState();

			expect(zoom?.level).to.eq(4);
			expect(zoom?.levels?.length).to.eq(6);

			const zoomFactor = 0.16;
			const dir = 1;
			const widths = zoomWidths(
				cellWidth as number,
				zoom?.level || 4,
				zoomSteps,
				1 + zoomFactor,
				zoom?.minCellWidth || minCellWidth,
				zoom?.maxCellWidth || maxCellWidth
			);

			// imitate zooming in on a single point
			for (let i = 0; i < zoomSteps; i++) {
				store.in.exec("zoom-scale", {
					dir,
					ratio: zoomFactor,
					offset,
				});

				({ cellWidth, zoom } = store.getState());

				expect(zoom?.level).to.eq(widths[i].level);
				expect(cellWidth).to.eq(widths[i].width);
			}
		});

		test("can zoom in and out", () => {
			const data = getData("full");
			const config = normalizeZoom(true, unitFormats, data.scales, 100);
			resetState({ ...data, ...config });
			let { zoom, cellWidth } = store.getState();

			expect(zoom?.level).to.eq(4);
			expect(zoom?.levels?.length).to.eq(6);

			// zoom in
			const dir = 1;
			const zoomFactor = 0.16;
			const widths = zoomWidths(
				cellWidth as number,
				zoom?.level || 4,
				zoomSteps,
				1 + zoomFactor,
				zoom?.minCellWidth || minCellWidth,
				zoom?.maxCellWidth || maxCellWidth
			);

			for (let i = 0; i < zoomSteps; i++) {
				store.in.exec("zoom-scale", {
					dir,
					ratio: zoomFactor,
					offset,
				});

				({ cellWidth, zoom } = store.getState());

				expect(zoom?.level).to.eq(widths[i].level);
				expect(cellWidth).to.eq(widths[i].width);
			}

			// zoom out
			const dirOut = -1;
			const outWidths = zoomWidths(
				cellWidth as number,
				zoom?.level || 4,
				zoomSteps,
				1 - zoomFactor,
				zoom?.minCellWidth || minCellWidth,
				zoom?.maxCellWidth || maxCellWidth
			);

			for (let i = 0; i < zoomSteps; i++) {
				store.in.exec("zoom-scale", {
					dir: dirOut,
					ratio: zoomFactor,
					offset,
				});

				({ cellWidth, zoom } = store.getState());

				expect(zoom?.level).to.eq(outWidths[i].level);
				expect(cellWidth).to.eq(outWidths[i].width);
			}
		});

		test("api.exec without offset still changes scale (current date zoom)", () => {
			const data = getData("full");
			const config = normalizeZoom(true, unitFormats, data.scales, 100);
			resetState({ ...data, ...config });

			const api = { exec: store.in.exec.bind(store.in) } as any;

			const before = store.getState().cellWidth as number;
			api.exec("zoom-scale", { dir: 1, ratio: 0.16 });
			const { cellWidth: after, scrollLeft } = store.getState();
			expect(after).to.be.gt(before);
			expect(scrollLeft).to.eq(0);
		});

		test("api.exec without ratio still changes scale (current date zoom)", () => {
			const data = getData("full");
			const config = normalizeZoom(true, unitFormats, data.scales, 100);
			resetState({ ...data, ...config });

			const api = { exec: store.in.exec.bind(store.in) } as any;

			const before = store.getState().cellWidth as number;
			api.exec("zoom-scale", { dir: 1 });
			const { cellWidth: after, scrollLeft } = store.getState();
			expect(after).to.be.gt(before);
			expect(scrollLeft).to.eq(0);
		});
	});

	describe("zoom widthCell configuration", () => {
		test("level-specific settings override root settings", () => {
			const baseZoomConfig = {
				level: 3,
				minCellWidth: 40,
				maxCellWidth: 350,
				levels: [
					{
						minCellWidth: 50,
						maxCellWidth: 300,
						scales: [{ unit: "year", step: 1, format: "%Y" }],
					},
					{
						minCellWidth: 50,
						maxCellWidth: 300,
						scales: [{ unit: "quarter", step: 1, format: "%Q" }],
					},
					{
						minCellWidth: 50,
						maxCellWidth: 300,
						scales: [{ unit: "month", step: 1, format: "%M" }],
					},
					{
						minCellWidth: 50,
						maxCellWidth: 300,
						scales: [{ unit: "week", step: 1, format: "%w" }],
					},
				],
			};

			resetState({ ...getData("full"), zoom: baseZoomConfig });
			const { zoom } = store.getState();

			// Each level should use its specific min/max settings, not the root settings
			zoom?.levels?.forEach((level, index) => {
				expect(level.minCellWidth).to.eq(
					baseZoomConfig.levels[index].minCellWidth
				);
				expect(level.maxCellWidth).to.eq(
					baseZoomConfig.levels[index].maxCellWidth
				);
			});
		});

		test("uses root widths settings when levels is not provided", () => {
			const simpleZoomConfig = {
				level: 2,
				minCellWidth: 45,
				maxCellWidth: 355,
			};

			resetState({ ...getData("full"), zoom: simpleZoomConfig });
			const { zoom } = store.getState();
			const defaultLevels = zoom?.levels || [];

			// Check that each default level has been adjusted to respect the root min/max settings
			zoom?.levels?.forEach((level, index) => {
				const expectedMin = Math.max(
					defaultLevels[index].minCellWidth,
					simpleZoomConfig.minCellWidth
				);
				const expectedMax = Math.min(
					defaultLevels[index].maxCellWidth,
					simpleZoomConfig.maxCellWidth
				);
				expect(level.minCellWidth).to.eq(expectedMin);
				expect(level.maxCellWidth).to.eq(expectedMax);
			});
		});
	});
});
