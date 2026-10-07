import { test, expect, describe, beforeEach, afterEach, vi } from "vitest";
import { DataStore } from "../src/index";
import { getData } from "./stubs/data";
import { resetScales } from "../src/scales";
import { SCurveColumns, getSCurveDate } from "../src/pro/sCurve";
import { resolveSCurvePoint } from "../src/helpers/sCurve";
import { Calendar } from "../src/schedule-types";
import { writable } from "./stubs/writable";
import {
	GanttScaleData,
	ICalendar,
	IDataConfig,
	ITask,
	TSCurveLine,
	TSCurveMetric,
	TSCurveType,
} from "../src/types";

const chartHeight = 216;
const plotTop = 16;
const plotBottom = 200;

function initStore(overrides: Partial<IDataConfig> = {}): DataStore {
	const store = new DataStore(writable);
	store.init({
		...getData(),
		links: [],
		_chartHeight: chartHeight,
		...overrides,
	});
	vi.advanceTimersByTime(1);

	return store;
}

// Week wide columns of daily steps, the shape the chart takes when zoomed out
function zoomedOut(overrides: Partial<IDataConfig> = {}): DataStore {
	return initStore({
		lengthUnit: "day",
		scales: [
			{ unit: "month", step: 1, format: "MMMM yyy" },
			{ unit: "week", step: 1, format: "w" },
		],
		...overrides,
	});
}

function seriesOf(
	store: DataStore,
	type: TSCurveType = "scheduled",
	metric: TSCurveMetric = "duration"
) {
	const line = store
		.getState()
		._sCurve!.lines.find(l => l.type === type && l.metric === metric);
	return Array.from(line!.series).map(v => +v.toFixed(6));
}

function task(id: number, start: Date, end: Date, rest?: Partial<ITask>) {
	return {
		id,
		text: `Task ${id}`,
		type: "task",
		parent: 0,
		start,
		end,
		...rest,
	};
}

const april = (day: number) => new Date(2024, 3, day);

describe("s-curve config", () => {
	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test("is disabled by default", () => {
		const store = initStore();
		expect(store.getState().sCurve).to.eq(false);
		expect(store.getState()._sCurve).to.eq(null);
	});

	test("true expands to earned by duration", () => {
		const store = initStore({ sCurve: true });
		expect(store.getState().sCurve).to.deep.eq([
			{ type: "earned", metric: "duration" },
		]);
	});

	test("fills in the default metric and keeps css", () => {
		const store = initStore({
			sCurve: [{ type: "earned", css: "my-line" }],
		});
		expect(store.getState().sCurve).to.deep.eq([
			{ type: "earned", metric: "duration", css: "my-line" },
		]);
	});

	test("drops unknown types and duplicated lines", () => {
		const store = initStore({
			sCurve: [
				{ type: "earned" },
				{ type: "earned", metric: "duration" },
				{ type: "earned", metric: "progress" },
				{ type: "planned" } as any,
			],
		});
		expect(store.getState().sCurve).to.deep.eq([
			{ type: "earned", metric: "duration" },
			{ type: "earned", metric: "progress" },
		]);
	});

	test("a config with no valid lines counts as disabled", () => {
		const empty = initStore({ sCurve: [] });
		expect(empty.getState().sCurve).to.eq(false);
		expect(empty.getState()._sCurve).to.eq(null);

		const invalid = initStore({ sCurve: [{ type: "planned" }] as any });
		expect(invalid.getState().sCurve).to.eq(false);
		expect(invalid.getState()._sCurve).to.eq(null);
	});
});

describe("s-curve calculation", () => {
	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test("reports the work done before each column", () => {
		// Scale starts Apr 1, tasks run Apr 2-5 and Apr 6-8
		const store = initStore({ sCurve: [{ type: "scheduled" }] });

		expect(seriesOf(store)).to.deep.eq([
			0, 0, 0.2, 0.4, 0.6, 0.6, 0.8, 1, 1,
		]);
		expect(store.getState()._sCurve!.start).to.eq(1);
		expect(store.getState()._sCurve!.end).to.eq(7);
	});

	test("stays flat across a weekend", () => {
		// Friday to Tuesday, so only Friday and Monday are working
		const store = initStore({
			sCurve: [{ type: "scheduled" }],
			calendar: "default",
			tasks: [task(1, april(5), april(9))],
		});

		const series = seriesOf(store);
		const saturday = 2;
		const sunday = 3;
		const monday = 4;

		expect(series[saturday]).to.eq(series[sunday]);
		expect(series[saturday]).to.eq(0.5);
		expect(series[monday + 1]).to.eq(1);
	});

	test("stays flat across a weekend under any metric", () => {
		const tasks = [
			task(1, april(5), april(9)),
			task(2, april(10), april(12)),
		];
		const store = initStore({
			sCurve: [
				{ type: "scheduled" },
				{ type: "scheduled", metric: "progress" },
			],
			calendar: "default",
			tasks,
		});

		const { _scales } = store.getState();
		const saturday = Math.round(
			_scales.diff(april(6), _scales.start, "day")
		);

		(["duration", "progress"] as TSCurveMetric[]).forEach(metric => {
			const series = seriesOf(store, "scheduled", metric);
			expect(series[saturday]).to.be.greaterThan(0);
			expect(series[saturday + 1]).to.eq(series[saturday]);
			expect(series[saturday + 2]).to.eq(series[saturday]);
			expect(series[store.getState()._sCurve!.end]).to.eq(1);
		});
	});

	test("spans the project bounds when they are set", () => {
		const store = initStore({
			sCurve: [{ type: "scheduled" }],
			projectStart: april(1),
			projectEnd: april(12),
		});

		const { _sCurve, _scales } = store.getState();
		const { start, end } = _sCurve!;
		const series = seriesOf(store);

		expect(getSCurveDate(start, _scales!)).to.deep.eq(april(1));
		expect(getSCurveDate(end, _scales!)).to.deep.eq(april(12));
		// Flat at zero before the first task, flat at the total after the last
		expect(series[start]).to.eq(0);
		expect(series[start + 1]).to.eq(0);
		expect(series[end]).to.eq(1);
		expect(series[end - 1]).to.eq(1);
	});

	test("follows the tasks when no bounds are set", () => {
		const store = initStore({ sCurve: [{ type: "scheduled" }] });

		const { _sCurve, _scales } = store.getState();
		// Tasks run Apr 2-5 and Apr 6-8, and the scale is wider than that
		expect(getSCurveDate(_sCurve!.start, _scales!)).to.deep.eq(april(2));
		expect(getSCurveDate(_sCurve!.end, _scales!)).to.deep.eq(april(8));
	});

	test("holds the earned level to the right of the last task", () => {
		const store = initStore({
			sCurve: true,
			projectEnd: april(12),
			tasks: [task(1, april(2), april(6), { progress: 50 })],
		});

		const { end } = store.getState()._sCurve!;
		const earned = seriesOf(store, "earned");

		expect(earned[end]).to.eq(0.5);
		expect(earned[end]).to.eq(earned[end - 3]);
	});

	test("weighs a task by its duration", () => {
		const store = initStore({
			sCurve: [{ type: "scheduled" }],
			tasks: [
				task(1, april(1), april(11)),
				task(2, april(11), april(12)),
			],
		});

		const series = seriesOf(store);
		expect(series[11]).to.be.closeTo(10 / 11, 1e-6);
		expect(series[12] - series[11]).to.be.closeTo(1 / 11, 1e-6);
	});

	test("leaves a milestone out of every metric", () => {
		const tasks = [
			task(1, april(2), april(5)),
			task(2, april(6), april(8)),
		];
		const withMilestone = [
			...tasks,
			{ id: 3, text: "M", type: "milestone", parent: 0, start: april(4) },
		];
		const sCurve: TSCurveLine[] = [
			{ type: "scheduled" },
			{ type: "scheduled", metric: "progress" },
		];

		const plain = initStore({ sCurve, tasks });
		const milestone = initStore({ sCurve, tasks: withMilestone });

		(["duration", "progress"] as TSCurveMetric[]).forEach(metric => {
			expect(seriesOf(milestone, "scheduled", metric)).to.deep.eq(
				seriesOf(plain, "scheduled", metric)
			);
		});
	});

	test("weighs every task the same under the progress metric", () => {
		const store = initStore({
			sCurve: [
				{ type: "scheduled" },
				{ type: "scheduled", metric: "progress" },
			],
			tasks: [
				task(1, april(1), april(11)),
				task(2, april(11), april(12)),
			],
		});

		expect(seriesOf(store)[11]).to.be.closeTo(10 / 11, 1e-6);
		expect(seriesOf(store, "scheduled", "progress")[11]).to.eq(0.5);
	});

	test("a milestone carries no weight under the progress metric", () => {
		const store = initStore({
			sCurve: [{ type: "scheduled", metric: "progress" }],
			tasks: [
				task(1, april(2), april(4)),
				{
					id: 2,
					text: "M",
					type: "milestone",
					parent: 0,
					start: april(6),
				},
			],
		});

		// The lone task takes the whole weight and sets the end of the domain
		const series = seriesOf(store, "scheduled", "progress");
		expect(store.getState()._sCurve!.end).to.eq(3);
		expect(series[3]).to.eq(1);
	});

	test("survives a project of nothing but milestones", () => {
		const milestones = [
			{ id: 1, text: "A", type: "milestone", parent: 0, start: april(2) },
			{ id: 2, text: "B", type: "milestone", parent: 0, start: april(5) },
		];

		// Nothing is left to weigh under either metric, so there is no curve
		[
			[{ type: "scheduled" }],
			[{ type: "scheduled", metric: "progress" }],
		].forEach((sCurve: TSCurveLine[]) => {
			const store = initStore({ sCurve, tasks: milestones });
			expect(store.getState()._sCurve).to.eq(null);
			expect(store.getState()._sCurvePoints).to.eq(null);
		});
	});

	test("drops only the line that has no weight", () => {
		const store = initStore({
			sCurve: [
				{ type: "scheduled" },
				{ type: "scheduled", metric: "progress" },
			],
			calendar: "default",
			// The task sits on a weekend, so it holds no working column to weigh
			tasks: [task(1, april(6), april(8))],
		});

		const { lines } = store.getState()._sCurve!;
		expect(lines.map(l => l.metric)).to.deep.eq(["progress"]);
	});

	test("earned averages the tasks under the progress metric", () => {
		const store = initStore({
			sCurve: [{ type: "earned", metric: "progress" }],
			tasks: [
				task(1, april(1), april(5), { progress: 100 }),
				task(2, april(5), april(9), { progress: 0 }),
			],
		});

		const series = seriesOf(store, "earned", "progress");
		expect(series[series.length - 1]).to.eq(0.5);
	});

	test("baseline runs on the dates the task was planned for", () => {
		const store = initStore({
			sCurve: [{ type: "scheduled" }, { type: "baseline" }],
			tasks: [
				task(1, april(3), april(6), {
					base_start: april(1),
					base_end: april(4),
				}),
			],
		});

		// The task slipped two days, so the baseline tops out two columns earlier
		expect(seriesOf(store, "baseline")[3]).to.eq(1);
		expect(seriesOf(store, "scheduled")[3]).to.be.lessThan(1);
		expect(seriesOf(store, "scheduled")[5]).to.eq(1);
	});

	test("baseline leaves out a task that has none", () => {
		const store = initStore({
			sCurve: [{ type: "baseline" }],
			tasks: [
				task(1, april(2), april(4), {
					base_start: april(2),
					base_end: april(4),
				}),
				task(2, april(4), april(8)),
			],
		});

		// Two columns of baseline work, so the four unplanned ones are not counted
		expect(seriesOf(store, "baseline")[3]).to.eq(1);
		expect(store.getState()._sCurve!.end).to.eq(3);
	});

	test("counts a task with subtasks, but never a summary", () => {
		const store = initStore({
			sCurve: [{ type: "scheduled" }],
			tasks: [
				{
					id: 1,
					text: "S",
					type: "summary",
					parent: 0,
					start: april(1),
					end: april(5),
				},
				task(2, april(1), april(3), { parent: 1 }),
				task(3, april(3), april(5), { parent: 1 }),
				task(4, april(5), april(7)),
				task(5, april(5), april(6), { parent: 4 }),
			],
		});

		// 2 + 2 + 2 + 1 columns of work, the summary's 4 left out
		const series = seriesOf(store);
		expect(series[series.length - 1]).to.eq(1);
		expect(series[3]).to.be.closeTo(2 / 7, 1e-6);
	});

	test("reaches the total on the column the last task ends", () => {
		const store = initStore({
			sCurve: [{ type: "scheduled" }],
			tasks: [task(1, april(2), april(5))],
		});

		const { start, end } = store.getState()._sCurve!;
		const series = seriesOf(store);

		expect(series[start]).to.eq(0);
		expect(series[end]).to.eq(1);
		// Apr 5 both ends the task and tops out the curve
		expect(end).to.eq(4);
	});

	test("starts above zero when work runs before the scale", () => {
		const store = initStore({
			sCurve: [{ type: "scheduled" }],
			autoScale: false,
			start: april(5),
			end: april(10),
			tasks: [task(1, april(1), april(7))],
		});

		// Apr 1 to Apr 4 are behind the scale, only 2 of the 6 days are drawn
		const { start, end } = store.getState()._sCurve!;
		expect(seriesOf(store)[start]).to.be.closeTo(4 / 6, 1e-6);
		expect(seriesOf(store)[end]).to.eq(1);
	});

	test("weighs a task before the scale that holds no column of its own", () => {
		const store = initStore({
			sCurve: [{ type: "scheduled", metric: "progress" }],
			autoScale: false,
			start: april(5),
			end: april(10),
			tasks: [task(1, april(6), april(8)), task(2, april(1), april(1))],
		});

		const { start } = store.getState()._sCurve!;
		expect(seriesOf(store, "scheduled", "progress")[start]).to.eq(0.5);
	});

	test("stops short of the total when work runs past the scale", () => {
		const store = initStore({
			sCurve: [{ type: "scheduled" }, { type: "baseline" }],
			autoScale: false,
			start: april(1),
			end: april(6),
			tasks: [
				task(1, april(1), april(5), {
					base_start: april(1),
					base_end: april(3),
				}),
				task(2, april(10), april(15), {
					base_start: april(10),
					base_end: april(15),
				}),
			],
		});

		const { end } = store.getState()._sCurve!;
		// The second task is cut off, so 4 of 9 scheduled and 2 of 7 baseline
		// days are all the scale can show
		expect(seriesOf(store, "scheduled")[end]).to.be.closeTo(4 / 9, 1e-6);
		expect(seriesOf(store, "baseline")[end]).to.be.closeTo(2 / 7, 1e-6);
	});

	test("counts only the part of a task that fits in the scale", () => {
		const store = initStore({
			sCurve: [{ type: "scheduled" }],
			autoScale: false,
			start: april(1),
			end: april(6),
			tasks: [task(1, april(3), april(9))],
		});

		// Apr 3 to Apr 5 are drawn, the three days past the scale are not
		const { end } = store.getState()._sCurve!;
		expect(seriesOf(store)[end]).to.be.closeTo(3 / 6, 1e-6);
	});

	test("weighs a task past the scale that holds no column of its own", () => {
		const store = initStore({
			sCurve: [{ type: "scheduled", metric: "progress" }],
			autoScale: false,
			start: april(1),
			end: april(6),
			tasks: [task(1, april(2), april(4)), task(2, april(9), april(9))],
		});

		const { end } = store.getState()._sCurve!;
		expect(seriesOf(store, "scheduled", "progress")[end]).to.eq(0.5);
	});

	test("earned matches scheduled once everything is done", () => {
		const done = initStore({
			sCurve: [{ type: "scheduled" }, { type: "earned" }],
			tasks: [
				task(1, april(2), april(5), { progress: 100 }),
				task(2, april(6), april(8), { progress: 100 }),
			],
		});

		expect(seriesOf(done, "earned")).to.deep.eq(
			seriesOf(done, "scheduled")
		);
	});

	test("earned ignores a milestone", () => {
		const store = initStore({
			sCurve: [
				{ type: "scheduled", metric: "progress" },
				{ type: "earned", metric: "progress" },
			],
			tasks: [
				task(1, april(2), april(5), { progress: 100 }),
				{
					id: 2,
					text: "M",
					type: "milestone",
					parent: 0,
					start: april(6),
				},
			],
		});

		// Nothing sets progress on a milestone, so a stored 0 must not cap earned
		const earned = seriesOf(store, "earned", "progress");
		expect(earned).to.deep.eq(seriesOf(store, "scheduled", "progress"));
		expect(earned[earned.length - 1]).to.eq(1);
	});

	test("earned trails scheduled by the work still to do", () => {
		const store = initStore({
			sCurve: [{ type: "scheduled" }, { type: "earned" }],
			tasks: [task(1, april(2), april(6), { progress: 50 })],
		});

		const scheduled = seriesOf(store, "scheduled");
		const earned = seriesOf(store, "earned");

		expect(scheduled[5]).to.eq(1);
		expect(earned[5]).to.eq(0.5);
		expect(earned[3]).to.eq(0.5);
	});

	test("lands on whole columns when a column holds several days", () => {
		const store = zoomedOut({
			sCurve: [{ type: "scheduled" }],
			tasks: [
				task(1, april(1), april(11)),
				task(2, april(11), april(12)),
			],
		});
		const { _sCurve, _sCurvePoints } = store.getState();

		_sCurvePoints!.forEach(view =>
			view.points.forEach(point => {
				expect(Number.isInteger(point.index)).to.eq(true);
				expect(Number.isFinite(point.y)).to.eq(true);
				expect(
					Number.isFinite(
						_sCurve!.lines[view.line].series[point.index]
					)
				).to.eq(true);
			})
		);

		// The bounds fall inside a column here, and the series is indexed by column
		const series = seriesOf(store);
		expect(series[Math.floor(_sCurve!.start)]).to.eq(0);
		expect(series[Math.ceil(_sCurve!.end)]).to.eq(1);
	});

	test("ends the line on the task, not on the column holding it", () => {
		const store = zoomedOut({
			sCurve: [{ type: "scheduled" }],
			tasks: [task(1, april(1), april(11))],
		});
		const { _sCurve, _sCurvePoints, _scales, cellWidth } = store.getState();
		const { start, end } = _sCurve!;

		// A week wide column would round Apr 1 and Apr 11 to its own edges
		expect(start).to.eq(_scales!.diff(april(1), _scales!.start, "day"));
		expect(end).to.eq(_scales!.diff(april(11), _scales!.start, "day"));
		expect(Number.isInteger(end)).to.eq(false);

		// The last point sits on the task, and still reports the total
		const points = _sCurvePoints![0].points;
		const last = points[points.length - 1];
		expect(last.x).to.eq(end * cellWidth!);
		expect(seriesOf(store)[last.index]).to.eq(1);
	});

	test("weighs days, not columns, when a column holds several days", () => {
		const store = zoomedOut({
			sCurve: [{ type: "scheduled" }],
			tasks: [
				task(1, april(1), april(11)),
				// A week of its own, so quantizing cannot hide the weight
				task(2, new Date(2024, 4, 1), new Date(2024, 4, 2)),
			],
		});

		const series = seriesOf(store);
		const may = Math.ceil(store.getState()._sCurve!.end) - 1;

		expect(series[may]).to.be.closeTo(10 / 11, 1e-6);
	});

	test("keeps the curve across a task edit that cannot move it", () => {
		const store = initStore({ sCurve: [{ type: "scheduled" }] });
		const before = seriesOf(store);

		store.in.exec("update-task", { id: 1, task: { text: "renamed" } });
		vi.advanceTimersByTime(1);

		expect(seriesOf(store)).to.deep.eq(before);
	});

	test("follows a task whose progress changes", () => {
		const store = initStore({ sCurve: true });
		const before = seriesOf(store, "earned");

		store.in.exec("update-task", { id: 1, task: { progress: 100 } });
		vi.advanceTimersByTime(1);

		expect(seriesOf(store, "earned")).to.not.deep.eq(before);
	});

	test("follows a calendar that stops being a working one", () => {
		const tasks = [task(1, april(1), april(6))];

		const workweek = initStore({
			sCurve: [{ type: "scheduled" }],
			calendar: "default",
			tasks,
		});
		const wednesdayOff = initStore({
			sCurve: [{ type: "scheduled" }],
			calendar: "wednesday-off",
			tasks,
		});

		expect(seriesOf(wednesdayOff)).to.not.deep.eq(seriesOf(workweek));
	});
});

describe("s-curve geometry", () => {
	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test("stays null while the curve is disabled", () => {
		expect(initStore().getState()._sCurvePoints).to.eq(null);
		expect(initStore({ sCurve: false }).getState()._sCurvePoints).to.eq(
			null
		);
	});

	test("returns one view per calculated line, in order", () => {
		const store = initStore({
			sCurve: [{ type: "earned", css: "my-line" }, { type: "scheduled" }],
		});
		const views = store.getState()._sCurvePoints;

		expect(views.map(v => [v.line, v.type, v.metric, v.css])).to.deep.eq([
			[0, "earned", "duration", "my-line"],
			[1, "scheduled", "duration", undefined],
		]);
	});

	test("converts columns into chart pixels", () => {
		const store = initStore({ sCurve: [{ type: "scheduled" }] });
		const { _sCurve, _sCurvePoints, _scales } = store.getState();

		const line = _sCurve!.lines[0];
		const view = _sCurvePoints[0];
		expect(view.points.length).to.eq(_sCurve!.end - _sCurve!.start + 1);

		view.points.forEach(point => {
			expect(point.x).to.eq(point.index * _scales!.lengthUnitWidth);
			expect(point.y).to.eq(
				plotTop +
					(1 - line.series[point.index]) * (plotBottom - plotTop)
			);
		});

		expect(view.points[0].y).to.eq(plotBottom);
		expect(view.points[view.points.length - 1].y).to.eq(plotTop);
		expect(view.path).to.eq(
			view.points.map(p => `${p.x},${p.y}`).join(" ")
		);
	});

	test("draws nothing outside the domain", () => {
		const store = initStore({ sCurve: [{ type: "scheduled" }] });
		const { _sCurve, _sCurvePoints } = store.getState();
		const points = _sCurvePoints[0].points;

		expect(points[0].index).to.eq(_sCurve!.start);
		expect(points[points.length - 1].index).to.eq(_sCurve!.end);
	});

	test("keeps only the visible columns, plus one on each side", () => {
		const store = initStore({
			sCurve: [{ type: "scheduled" }],
			_chartWidth: 100,
			scrollLeft: 400,
		});
		const { xArea, _sCurve, _sCurvePoints, _scales } = store.getState();
		const points = _sCurvePoints[0].points;

		expect(points.length).to.be.lessThan(_sCurve!.end - _sCurve!.start + 1);
		expect(points[0].x).to.be.lessThan(xArea.from);
		expect(points[points.length - 1].x).to.be.greaterThanOrEqual(xArea.to);
		expect(points[0].index * _scales!.lengthUnitWidth).to.eq(points[0].x);
	});

	test("follows the viewport without recalculating the curve", () => {
		const store = initStore({
			sCurve: [{ type: "scheduled" }],
			_chartWidth: 100,
			scrollLeft: 400,
		});
		const curve = store.getState()._sCurve;
		const points = store.getState()._sCurvePoints;

		store.setState({ scrollLeft: 0 });
		vi.advanceTimersByTime(1);

		expect(store.getState()._sCurve).to.eq(curve);
		expect(store.getState()._sCurvePoints).to.not.eq(points);
		expect(store.getState()._sCurvePoints[0].points[0].index).to.eq(
			curve!.start
		);
	});
});

// Stands in for the marker the pointer is over, the pair the view renders
function hover(store: DataStore, line: number, index: number) {
	const node = {
		closest: (selector: string) =>
			selector === ".wx-scurve-point" ? node : null,
		getAttribute: (name: string) =>
			String(name === "data-scurve-line" ? line : index),
	};

	return resolveSCurvePoint(store, node as unknown as EventTarget);
}

function markers(store: DataStore, line = 0) {
	return store.getState()._sCurvePoints![line].points;
}

describe("s-curve tooltip", () => {
	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test("reports the date of the column a marker sits on", () => {
		const store = initStore({ sCurve: [{ type: "scheduled" }] });
		const points = markers(store);

		points.forEach(point => {
			expect(hover(store, 0, point.index)!.date).to.deep.eq(
				getSCurveDate(point.index, store.getState()._scales!)
			);
		});
	});

	test("reports the date a bounding marker is drawn at, not its column", () => {
		const store = zoomedOut({
			sCurve: [{ type: "scheduled" }],
			tasks: [task(1, april(1), april(11))],
		});
		const { _sCurve, _scales, cellWidth } = store.getState();
		const points = markers(store);
		const first = points[0];
		const last = points[points.length - 1];

		// Both bounds fall inside a week wide column here
		expect(Number.isInteger(_sCurve!.end)).to.eq(false);
		expect(first.x).to.eq(_sCurve!.start * cellWidth!);
		expect(last.x).to.eq(_sCurve!.end * cellWidth!);

		expect(hover(store, 0, first.index)!.date).to.deep.eq(april(1));
		expect(hover(store, 0, last.index)!.date).to.deep.eq(april(11));

		// The column each one reads its value from starts earlier
		expect(getSCurveDate(last.index, _scales!)).to.be.greaterThan(
			april(11)
		);
		expect(getSCurveDate(first.index, _scales!)).to.be.lessThan(april(1));
	});

	test("keeps every marker's date inside the domain", () => {
		const store = zoomedOut({
			sCurve: true,
			tasks: [
				task(1, april(1), april(11)),
				task(2, april(11), april(12)),
			],
		});
		const { _sCurve, _scales } = store.getState();
		const from = getSCurveDate(_sCurve!.start, _scales!);
		const to = getSCurveDate(_sCurve!.end, _scales!);

		store.getState()._sCurvePoints!.forEach((view, line) =>
			view.points.forEach(point => {
				const { date } = hover(store, line, point.index)!;
				expect(+date).to.be.greaterThanOrEqual(+from);
				expect(+date).to.be.lessThanOrEqual(+to);
			})
		);
	});

	test("carries every line, flagging the hovered one", () => {
		const store = initStore({
			sCurve: [{ type: "scheduled" }, { type: "earned" }],
		});
		const point = markers(store, 1)[2];
		const tooltip = hover(store, 1, point.index)!;

		expect(tooltip.lines.map(l => [l.line, l.type])).to.deep.eq([
			[0, "scheduled"],
			[1, "earned"],
		]);
		expect(tooltip.hovered).to.eq(tooltip.lines[1]);
		expect(tooltip.hovered.value).to.eq(
			store.getState()._sCurve!.lines[1].series[point.index] * 100
		);
	});

	test("ignores a target that is not a marker", () => {
		const store = initStore({ sCurve: true });
		expect(resolveSCurvePoint(store, null)).to.eq(null);
		expect(
			resolveSCurvePoint(store, {
				closest: () => null,
			} as unknown as EventTarget)
		).to.eq(null);
	});
});

// 2024-04-01 is a Monday, so the first weekend sits at columns 5 and 6
const scaleStart = new Date(2024, 3, 1);
const scaleEnd = new Date(2024, 3, 15);

function dayColumns(): SCurveColumns {
	const scales = resetScales(
		scaleStart,
		scaleEnd,
		"day",
		100,
		30,
		1,
		[{ unit: "day", step: 1, format: "d" }],
		1
	) as GanttScaleData;

	return new SCurveColumns(scales);
}

function hourColumns(): SCurveColumns {
	const scales = resetScales(
		new Date(2024, 3, 5),
		new Date(2024, 3, 7),
		"hour",
		20,
		30,
		1,
		[{ unit: "hour", step: 1, format: "H" }],
		1
	) as GanttScaleData;

	return new SCurveColumns(scales);
}

const workweek = (): ICalendar => new Calendar({});

function workingColumns(
	columns: SCurveColumns,
	calendar: ICalendar | undefined,
	ranges: { start: Date; end: Date }[]
): number[] {
	const work = columns.getWork(calendar, ranges);
	return Array.from(work.columns.subarray(0, work.length));
}

describe("s-curve columns", () => {
	test("counts one column per scale unit", () => {
		expect(dayColumns().getCount()).to.eq(14);
		expect(hourColumns().getCount()).to.eq(48);
	});

	test("indexes dates into the scale", () => {
		const columns = dayColumns();
		expect(columns.indexOf(scaleStart)).to.eq(0);
		expect(columns.indexOf(new Date(2024, 3, 4))).to.eq(3);
		expect(columns.indexOf(new Date(2024, 2, 1))).to.eq(0);
		expect(columns.indexOf(new Date(2024, 5, 1))).to.eq(13);
	});

	test("treats every column as working without a calendar", () => {
		const columns = dayColumns();
		const range = [{ start: scaleStart, end: new Date(2024, 3, 8) }];
		expect(workingColumns(columns, undefined, range)).to.deep.eq([
			0, 1, 2, 3, 4, 5, 6,
		]);
	});

	test("skips the columns a calendar marks as non-working", () => {
		const columns = dayColumns();
		const range = [{ start: scaleStart, end: new Date(2024, 3, 8) }];
		expect(workingColumns(columns, workweek(), range)).to.deep.eq([
			0, 1, 2, 3, 4,
		]);
	});

	test("counts a column a range only partly covers", () => {
		const columns = dayColumns();
		expect(
			workingColumns(columns, workweek(), [
				{ start: new Date(2024, 3, 3), end: new Date(2024, 3, 3, 12) },
			])
		).to.deep.eq([2]);
	});

	test("finds no work in a range of no length", () => {
		const columns = dayColumns();
		const milestone = new Date(2024, 3, 3);

		expect(
			workingColumns(columns, workweek(), [
				{ start: milestone, end: milestone },
			])
		).to.deep.eq([]);
	});

	test("returns nothing when no column of a range is working", () => {
		const columns = dayColumns();
		const saturday = new Date(2024, 3, 6);

		expect(
			workingColumns(columns, workweek(), [
				{ start: saturday, end: new Date(2024, 3, 8) },
			])
		).to.deep.eq([]);
	});

	test("counts work before the scale ahead of its first column", () => {
		const columns = dayColumns();
		// Wed to Fri of the previous week, all outside the scale
		const before = workingColumns(columns, workweek(), [
			{ start: new Date(2024, 2, 27), end: new Date(2024, 2, 30) },
		]);
		expect(before).to.deep.eq([-1, -1, -1]);

		const crossing = workingColumns(columns, workweek(), [
			{ start: new Date(2024, 2, 28), end: new Date(2024, 3, 3) },
		]);
		expect(crossing).to.deep.eq([-1, -1, 0, 1]);
	});

	test("counts work after the scale past its last column", () => {
		const columns = dayColumns();
		// Wed to Fri of the week the scale ends before
		const after = workingColumns(columns, workweek(), [
			{ start: new Date(2024, 3, 17), end: new Date(2024, 3, 20) },
		]);
		expect(after).to.deep.eq([14, 14, 14]);

		const crossing = workingColumns(columns, workweek(), [
			{ start: new Date(2024, 3, 12), end: new Date(2024, 3, 17) },
		]);
		expect(crossing).to.deep.eq([11, 14, 14]);
	});

	test("counts each segment separately, skipping the gaps", () => {
		const columns = dayColumns();
		const segments = [
			{ start: scaleStart, end: new Date(2024, 3, 3) },
			{ start: new Date(2024, 3, 10), end: new Date(2024, 3, 12) },
		];

		expect(workingColumns(columns, workweek(), segments)).to.deep.eq([
			0, 1, 9, 10,
		]);
	});

	test("gives sub-day columns the working state of their day", () => {
		const columns = hourColumns();
		// The scale starts on Friday, so the second day is a Saturday
		const friday = workingColumns(columns, workweek(), [
			{ start: new Date(2024, 3, 5), end: new Date(2024, 3, 6) },
		]);
		const saturday = workingColumns(columns, workweek(), [
			{ start: new Date(2024, 3, 6), end: new Date(2024, 3, 7) },
		]);

		expect(friday.length).to.eq(24);
		expect(friday[0]).to.eq(0);
		expect(friday[23]).to.eq(23);
		expect(saturday).to.deep.eq([]);
	});
});
