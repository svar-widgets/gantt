import { describe, test, expect, vi, beforeEach } from "vitest";
import { DataStore as GridStore } from "@svar-ui/grid-store";
import { DataStore } from "../src/index";
import { toInclusiveTask, fromInclusiveTask } from "../src/inclusiveEnd";
import { normalizeColumns } from "../src/columns";
import { prepareEditTask } from "../src/normalizeDates";
import { Calendar } from "../src/schedule-types";
import { getData } from "./stubs/data";
import { writable } from "./stubs/writable";
import type { IGanttColumn, ITask } from "../src/types";

const posted = vi.hoisted(() => ({ data: null as any }));
vi.mock("../src/dom/formPost", () => ({
	postToNewWindow: (_url: string, form: { data: string }) => {
		posted.data = JSON.parse(form.data);
	},
}));
const downloaded = vi.hoisted(() => ({ xml: "" }));
vi.mock("@svar/lib-mspx", async importOriginal => ({
	...(await importOriginal<typeof import("@svar/lib-mspx")>()),
	downloadAs: (xml: string) => {
		downloaded.xml = xml;
	},
}));

// Mon 1 Apr 2024 – Fri 5 Apr 2024
const mon = new Date(2024, 3, 1);
const fri = new Date(2024, 3, 5);
const sat = new Date(2024, 3, 6);

const day = (d: Date) => d.valueOf();

describe("inclusiveEnd", () => {
	describe("round trip", () => {
		const stored = { id: 1, start: mon, end: sat, deadline: sat };

		test("with and without start", () => {
			const shown = toInclusiveTask(stored);
			expect(day(shown.end)).to.eq(day(fri));
			expect(day(fromInclusiveTask(shown, "end", stored).end)).to.eq(
				day(sat)
			);
			expect(
				day(fromInclusiveTask(shown, "deadline", stored).deadline)
			).to.eq(day(sat));
		});

		test("an empty span shows start", () => {
			const shown = toInclusiveTask({ ...stored, end: mon });
			expect(day(shown.end)).to.eq(day(mon));
		});

		test("without start there is no clamp", () => {
			// a deadline of Mon 00:00 on a task that starts Mon
			const shown = toInclusiveTask({ ...stored, deadline: mon });
			expect(day(shown.deadline)).to.eq(day(new Date(2024, 2, 31)));
		});
	});

	describe("task values", () => {
		const task: Partial<ITask> = {
			id: 1,
			type: "task",
			start: mon,
			end: sat,
			duration: 5,
			base_start: mon,
			base_end: sat,
			deadline: sat,
			constraint: { type: "fnlt", date: sat },
		};

		test("end-like dates are shown a day earlier, duration is kept", () => {
			const shown = toInclusiveTask(task);
			expect(day(shown.start)).to.eq(day(mon));
			expect(day(shown.end)).to.eq(day(fri));
			expect(day(shown.base_end)).to.eq(day(fri));
			expect(day(shown.deadline)).to.eq(day(fri));
			expect(day(shown.constraint.date)).to.eq(day(fri));
			expect(shown.duration).to.eq(5);
			// the source is not changed
			expect(day(task.end)).to.eq(day(sat));
		});

		test("segment ends are shown against the segment start", () => {
			const tue = new Date(2024, 3, 2);
			const thu = new Date(2024, 3, 4);
			const segments = [
				{ start: mon, end: new Date(2024, 3, 3) },
				{ start: thu, end: thu },
			];
			const shown = toInclusiveTask({ ...task, segments });
			expect(shown.segments.map(s => day(s.end))).to.deep.eq([
				day(tue),
				day(thu),
			]);
			// the source is not changed
			expect(day(segments[0].end)).to.eq(day(new Date(2024, 3, 3)));
		});

		test("start-side constraints and milestones are not converted", () => {
			const snet = toInclusiveTask({
				...task,
				constraint: { type: "snet", date: mon },
			});
			expect(day(snet.constraint.date)).to.eq(day(mon));

			// FNLT stored Sat: Fri on a task, Sat on a milestone
			const milestone = toInclusiveTask({
				...task,
				type: "milestone",
				end: mon,
			});
			expect(day(milestone.constraint.date)).to.eq(day(sat));
			expect(day(milestone.end)).to.eq(day(mon));
		});

		describe("with a Mon–Fri calendar", () => {
			const calendar = new Calendar({
				weekHours: {
					monday: 8,
					tuesday: 8,
					wednesday: 8,
					thursday: 8,
					friday: 8,
					saturday: 0,
					sunday: 0,
				},
			});
			const nextMon = new Date(2024, 3, 8);

			test("dates after non-working days are shown on the last working day", () => {
				const stored = {
					...task,
					end: nextMon,
					base_end: nextMon,
					deadline: nextMon,
					constraint: { type: "fnlt", date: nextMon },
					segments: [{ start: mon, end: nextMon }],
				} as Partial<ITask>;
				const shown = toInclusiveTask(stored, calendar);
				expect(day(shown.end)).to.eq(day(fri));
				expect(day(shown.base_end)).to.eq(day(fri));
				expect(day(shown.deadline)).to.eq(day(fri));
				expect(day(shown.constraint.date)).to.eq(day(fri));
				expect(day(shown.segments[0].end)).to.eq(day(fri));

				// Sat 00:00 is Fri as well; without a calendar Mon 00:00 is Sun
				expect(day(toInclusiveTask(task, calendar).end)).to.eq(
					day(fri)
				);
				expect(day(toInclusiveTask(stored).end)).to.eq(
					day(new Date(2024, 3, 7))
				);
			});

			test("the walk stops at the span start", () => {
				const sun = new Date(2024, 3, 7);
				const shown = toInclusiveTask(
					{ ...task, start: sun, end: nextMon },
					calendar
				);
				expect(day(shown.end)).to.eq(day(sun));
			});
		});
	});

	describe("editor update", () => {
		const mon8 = new Date(2024, 3, 8);
		const tue9 = new Date(2024, 3, 9);
		const stored: Partial<ITask> = {
			id: 1,
			type: "task",
			start: mon,
			end: sat,
			duration: 5,
			base_start: mon,
			base_end: sat,
			deadline: sat,
			constraint: { type: "fnlt", date: sat },
			segments: [{ start: mon, end: sat }],
		};

		function edit(key: string, value: any, from = stored) {
			return fromInclusiveTask(
				{ ...toInclusiveTask(from), [key]: value },
				key,
				from
			);
		}

		test("the edited end-like date is stored a day later", () => {
			expect(day(edit("end", mon8).end)).to.eq(day(tue9));
			expect(day(edit("base_end", mon8).base_end)).to.eq(day(tue9));
			expect(day(edit("deadline", mon8).deadline)).to.eq(day(tue9));
		});

		test("other end-like dates keep their stored values", () => {
			const task = edit("text", "renamed");
			expect(task.text).to.eq("renamed");
			expect(day(task.end)).to.eq(day(sat));
			expect(day(task.base_end)).to.eq(day(sat));
			expect(day(task.deadline)).to.eq(day(sat));
			expect(day(task.constraint.date)).to.eq(day(sat));
			expect(day(task.segments[0].end)).to.eq(day(sat));
		});

		test("an untouched empty span keeps its end", () => {
			const empty = { ...stored, end: mon, duration: 0 };
			expect(day(edit("start", mon, empty).end)).to.eq(day(mon));
		});

		test("a cleared date stays empty", () => {
			expect(edit("deadline", null).deadline).to.eq(null);
		});

		test("a finish-side constraint of a task is stored a day later", () => {
			const task = edit("constraint", { type: "mfo", date: mon8 });
			expect(day(task.constraint.date)).to.eq(day(tue9));
		});

		test("start-side and milestone constraints are stored as entered", () => {
			const snet = edit("constraint", { type: "snet", date: mon8 });
			expect(day(snet.constraint.date)).to.eq(day(mon8));

			const milestone = { ...stored, type: "milestone" as const };
			const fnlt = edit(
				"constraint",
				{ type: "fnlt", date: mon8 },
				milestone
			);
			expect(day(fnlt.constraint.date)).to.eq(day(mon8));
		});

		test("switching a milestone to a task keeps the stored constraint", () => {
			const milestone = { ...stored, type: "milestone" as const };
			const task = edit("type", "task", milestone);
			expect(day(task.constraint.date)).to.eq(day(sat));
			// and shows it a day earlier from now on
			expect(day(toInclusiveTask(task).constraint.date)).to.eq(day(fri));
		});
	});

	describe("grid columns", () => {
		const row = { id: 1, type: "task", start: mon, end: sat } as ITask;

		function getColumn(
			column: IGanttColumn,
			config: { inclusiveEnd?: boolean }
		) {
			return normalizeColumns([column], () => config)[0];
		}

		test("the getter follows the mode at run time", () => {
			const config = { inclusiveEnd: true };
			const col = getColumn({ id: "end" }, config);
			expect(day(col.getter(row))).to.eq(day(fri));

			config.inclusiveEnd = false;
			expect(day(col.getter(row))).to.eq(day(sat));
		});

		test("base_end and deadline columns are converted", () => {
			const config = { inclusiveEnd: true };
			const base = getColumn({ id: "base_end" }, config);
			const deadline = getColumn({ id: "deadline" }, config);
			const r = { ...row, base_start: mon, base_end: sat, deadline: mon };
			expect(day(base.getter(r))).to.eq(day(fri));
			expect(day(deadline.getter(r))).to.eq(day(new Date(2024, 2, 31)));
		});

		test("a column with its own getter is not converted", () => {
			const getter = (r: ITask) => r.end;
			const col = getColumn(
				{ id: "end", getter },
				{ inclusiveEnd: true }
			);
			expect(col.getter).to.eq(getter);
			expect(col.setter).to.eq(undefined);
		});

		test("a column with its own setter is not converted", () => {
			const setter = (r: ITask, v: Date) => (r.end = v);
			const template = (v: Date) => `${v.valueOf()}`;
			const col = getColumn(
				{ id: "end", setter, template },
				{ inclusiveEnd: true }
			);
			expect(col.getter).to.eq(undefined);
			expect(col.setter).to.eq(setter);
			expect(col.template).to.eq(template);
		});

		test("a setter on any other column is kept", () => {
			const setter = (r: ITask, v: string) => (r.text = v);
			const col = getColumn(
				{ id: "text", setter },
				{ inclusiveEnd: true }
			);
			expect(col.setter).to.eq(setter);
		});

		test("the setter mirrors the getter", () => {
			const config = { inclusiveEnd: true };
			const col = getColumn({ id: "end" }, config);
			const r = { ...row };
			col.setter(r, fri);
			expect(day(r.end)).to.eq(day(sat));
			col.setter(r, null);
			expect(r.end).to.eq(null);

			config.inclusiveEnd = false;
			col.setter(r, fri);
			expect(day(r.end)).to.eq(day(fri));
		});

		test("the inline editor preview shows the picked date", () => {
			const col = getColumn(
				{ id: "end", editor: "datepicker" },
				{ inclusiveEnd: true }
			);
			const grid = new GridStore(writable);
			grid.init({
				data: [{ ...row }],
				columns: [col],
				sizes: {
					rowHeight: 36,
					headerHeight: 36,
					footerHeight: 36,
					columnWidth: 160,
				},
			} as any);
			grid.in.exec("open-editor", { id: 1, column: "end" });
			grid.in.exec("editor", { value: fri });
			expect(grid.getState().editor.renderedValue).to.eq(fri + "");
		});

		test("an app template gets the stored value, also after a rebuild", () => {
			const calls: Date[][] = [];
			const template = (v: Date, r: ITask) => {
				calls.push([v, r.end]);
				return "";
			};
			const config = { inclusiveEnd: true };
			const col = getColumn({ id: "end", template }, config);
			col.template(col.getter(row), row, col);

			const rebuilt = getColumn(col, config);
			rebuilt.template(rebuilt.getter(row), row, rebuilt);

			expect(calls.length).to.eq(2);
			calls.forEach(([v, end]) => {
				expect(day(v)).to.eq(day(sat));
				expect(day(end)).to.eq(day(sat));
			});
		});

		test("columns without functions get the getter", () => {
			// as the export page gets them
			const json = JSON.parse(
				JSON.stringify(getColumn({ id: "end", template: () => "" }, {}))
			);
			const col = getColumn(json, { inclusiveEnd: true });
			expect(day(col.getter(row))).to.eq(day(fri));
		});
	});

	describe("store", () => {
		let store: DataStore;

		function init(
			inclusiveEnd: boolean,
			config: Record<string, any> = {},
			task: Partial<ITask> = { duration: 5 }
		) {
			const data = getData();
			store = new DataStore(writable);
			store.init({
				...data,
				inclusiveEnd,
				...config,
				tasks: [
					{
						id: 1,
						text: "Mon–Fri",
						type: "task",
						start: mon,
						...task,
					},
				],
				links: [],
				columns: [
					{ id: "text" },
					{ id: "start" },
					{ id: "end", header: { filter: "datepicker" } },
				],
			});
		}

		beforeEach(() => {
			posted.data = null;
			downloaded.xml = "";
		});

		const endColumn = () =>
			store.getState().columns.find(c => c.id === "end");

		// the path of the grid inline editor
		function enterEnd(shown: Date) {
			const state = store.getState();
			const update = { ...store.getTask(1) };
			endColumn().setter(update, shown);
			prepareEditTask(
				update,
				state,
				store.getTaskCalendar(update),
				"end"
			);
			store.in.exec("update-task", { id: 1, task: update });
		}

		test("a Mon–Fri task shows Fri, an edit to Fri saves Sat 00:00", () => {
			// Mon–Wed, stored end Thu 00:00
			init(true, {}, { duration: 3 });
			expect(day(endColumn().getter(store.getTask(1)))).to.eq(
				day(new Date(2024, 3, 3))
			);

			enterEnd(fri);
			const task = store.getTask(1);
			expect(day(task.end)).to.eq(day(sat));
			expect(task.duration).to.eq(5);
			expect(day(endColumn().getter(task))).to.eq(day(fri));
			expect(day(toInclusiveTask(task).end)).to.eq(day(fri));
		});

		test("a Mon–Fri calendar: an end entered on Sat saves Sat 00:00", () => {
			init(true, { calendar: "default" }, { duration: 3 });
			enterEnd(sat);
			const task = store.getTask(1);
			expect(task.duration).to.eq(5);
			expect(day(task.end)).to.eq(day(sat));
			expect(day(endColumn().getter(task))).to.eq(day(fri));
		});

		test("a Mon–Fri calendar: an end after the weekend shows Fri", () => {
			const nextMon = new Date(2024, 3, 8);
			const nextSun = new Date(2024, 3, 7);
			const wed = new Date(2024, 3, 3);
			init(true, { calendar: "default" }, { start: wed, end: nextMon });
			let task = store.getTask(1);
			expect(day(task.end)).to.eq(day(nextMon));
			expect(task.duration).to.eq(3);
			expect(day(endColumn().getter(task))).to.eq(day(fri));

			// the user enters Sun: kept as Mon 00:00, still shown as Fri
			enterEnd(nextSun);
			task = store.getTask(1);
			expect(task.duration).to.eq(3);
			expect(day(endColumn().getter(task))).to.eq(day(fri));
			expect(
				day(toInclusiveTask(task, store.getTaskCalendar(task)).end)
			).to.eq(day(fri));

			// Excel export shows it the same way
			store.in.exec("export-data", { url: "test", format: "xlsx" });
			expect(posted.data.data.tasks[0].end.slice(0, 10)).to.eq(
				"2024-04-05"
			);
		});

		test("the event data is the same in the two modes", () => {
			const events: Date[] = [];
			for (const inclusiveEnd of [false, true]) {
				init(inclusiveEnd, {}, { duration: 3 });
				store.in.on("update-task", (ev: any) => {
					events.push(ev.task.end);
				});
				// the user picks the date shown for a Mon–Fri task
				enterEnd(inclusiveEnd ? fri : sat);
			}
			expect(events.length).to.eq(2);
			expect(day(events[0])).to.eq(day(sat));
			expect(day(events[1])).to.eq(day(events[0]));
		});

		test("the hour unit shows the dates as stored", () => {
			const fri17 = new Date(2024, 3, 5, 17);
			init(true, { durationUnit: "hour" }, { end: fri17 });
			const task = store.getTask(1);
			expect(day(task.end)).to.eq(day(fri17));
			expect(store.getState().inclusiveEnd).to.eq(false);
			expect(day(endColumn().getter(task))).to.eq(day(fri17));
		});

		test("inclusiveEnd is on in state with the day unit only", () => {
			init(false);
			expect(store.getState().inclusiveEnd).to.eq(false);

			const task = store.getTask(1);
			// gantt passes the whole config on every change
			const config = { inclusiveEnd: false, durationUnit: "day" };
			const change = (update: Record<string, any>) => {
				store.init(Object.assign(config, update));
				// read in the same tick, as the grid redraw does
				return day(endColumn().getter(task));
			};
			expect(change({ inclusiveEnd: true })).to.eq(day(fri));
			expect(store.getState().inclusiveEnd).to.eq(true);
			expect(change({ durationUnit: "hour" })).to.eq(day(sat));
			expect(store.getState().inclusiveEnd).to.eq(false);
			expect(change({ durationUnit: "day" })).to.eq(day(fri));
			expect(change({ inclusiveEnd: false })).to.eq(day(sat));
		});

		test("the stored data and serialize are the same in the two modes", () => {
			init(false);
			const exclusive = store.serialize();
			init(true);
			const inclusive = store.serialize();

			expect(day(inclusive[0].end)).to.eq(day(sat));
			expect(inclusive[0].duration).to.eq(5);
			expect(day(inclusive[0].end)).to.eq(day(exclusive[0].end));
		});

		test("the header filter finds the task with the shown date", () => {
			init(true);
			store.in.exec("filter-tasks", { key: "end", value: fri });
			expect(store.getState()._tasks.map(t => t.id)).to.deep.eq([1]);

			store.in.exec("filter-tasks", { key: "end", value: sat });
			expect(store.getState()._tasks.length).to.eq(0);
		});

		test("a mode change re-applies the header filter", () => {
			init(true);
			store.in.exec("filter-tasks", { key: "end", value: fri });
			const ids = () => store.getState()._tasks.map(t => t.id);
			expect(ids()).to.deep.eq([1]);

			// gantt passes the whole config on every change
			const config = { inclusiveEnd: true, durationUnit: "day" };
			const change = (update: Record<string, any>) =>
				store.init(Object.assign(config, update));

			change({ inclusiveEnd: false });
			expect(ids()).to.deep.eq([]);
			expect(day(store.getState().filterValues.end)).to.eq(day(fri));

			change({ inclusiveEnd: true });
			expect(ids()).to.deep.eq([1]);

			// the hour unit turns the display off
			change({ durationUnit: "hour" });
			expect(ids()).to.deep.eq([]);
		});

		test("Excel export sends the shown end, the store keeps it", () => {
			for (const visual of [false, true]) {
				const bars: number[][] = [];
				for (const inclusiveEnd of [false, true]) {
					init(inclusiveEnd);
					store.in.exec("export-data", {
						url: "test",
						format: "xlsx",
						excel: { visual },
					});
					const [task] = posted.data.data.tasks;
					const shown = inclusiveEnd ? fri : sat;
					// convertDates sends the local date as UTC
					expect(task.end.slice(0, 10)).to.eq(
						`2024-04-0${shown.getDate()}`
					);
					if (visual) bars.push([task.$x, task.$w]);
					expect(day(store.getTask(1).end)).to.eq(day(sat));
				}
				if (visual) expect(bars[0]).to.deep.eq(bars[1]);
			}
		});

		test("Excel export sends all end-like dates as shown", () => {
			const wed = new Date(2024, 3, 3);
			const thu = new Date(2024, 3, 4);
			init(
				true,
				{ splitTasks: true },
				{
					duration: 5,
					base_start: mon,
					base_end: sat,
					deadline: sat,
					constraint: { type: "fnlt", date: sat },
					segments: [
						{ start: mon, duration: 2 },
						{ start: thu, duration: 2 },
					],
				}
			);
			store.in.exec("export-data", { url: "test", format: "xlsx" });
			const [task] = posted.data.data.tasks;
			const date = (v: string) => v.slice(0, 10);

			expect(date(task.end)).to.eq("2024-04-05");
			expect(date(task.base_end)).to.eq("2024-04-05");
			expect(date(task.deadline)).to.eq("2024-04-05");
			expect(date(task.constraint.date)).to.eq("2024-04-05");
			expect(
				task.segments.map((s: ITask) => date(s.end as any))
			).to.deep.eq(["2024-04-02", "2024-04-05"]);

			const stored = store.getTask(1);
			expect(day(stored.base_end)).to.eq(day(sat));
			expect(day(stored.deadline)).to.eq(day(sat));
			expect(day(stored.segments[0].end)).to.eq(day(wed));
		});

		test("PDF export keeps the stored end and the flag", () => {
			init(true);
			store.in.exec("export-data", { url: "test", format: "pdf" });
			const { data } = posted.data;
			expect(data.inclusiveEnd).to.eq(true);
			expect(data.tasks[0].end.slice(0, 10)).to.eq("2024-04-06");
		});

		test("MS Project export writes the stored Finish in the two modes", () => {
			const files: string[] = [];
			for (const inclusiveEnd of [false, true]) {
				init(inclusiveEnd);
				store.in.exec("export-data", { format: "mspx" });
				files.push(downloaded.xml);
			}
			const finish = files.map(
				xml => xml.match(/<Task>[\s\S]*?<Finish>([^<]*)<\/Finish>/)?.[1]
			);
			expect(finish[0]).to.match(/^2024-04-06T00:00:00/);
			expect(finish[1]).to.eq(finish[0]);
		});

		describe("deadline edits", () => {
			const sun = new Date(2024, 3, 7);
			const nextMon = new Date(2024, 3, 8);
			const weekdays = { calendar: "default", deadlines: true };

			// the path of the editor
			function enterDeadline(picked: Date) {
				const stored = store.getTask(1);
				const calendar = store.getTaskCalendar(stored);
				const update = store.getState().inclusiveEnd
					? fromInclusiveTask(
							{
								...toInclusiveTask(stored, calendar),
								deadline: picked,
							},
							"deadline",
							stored
						)
					: { ...stored, deadline: picked };
				store.in.exec("update-task", { id: 1, task: update });
				const task = store.getTask(1);
				return {
					stored: day(task.deadline),
					shown: day(toInclusiveTask(task, calendar).deadline),
				};
			}

			test("a weekend date is saved as Sat 00:00 in the two modes", () => {
				init(false, weekdays);
				expect(enterDeadline(sun).stored).to.eq(day(sat));
				expect(enterDeadline(nextMon).stored).to.eq(day(sat));

				init(true, weekdays);
				for (const picked of [fri, sat, sun]) {
					const { stored, shown } = enterDeadline(picked);
					expect(stored).to.eq(day(sat));
					expect(shown).to.eq(day(fri));
				}
			});

			test("a working day is kept", () => {
				init(false, weekdays);
				expect(enterDeadline(sat).stored).to.eq(day(sat));
				expect(enterDeadline(fri).stored).to.eq(day(fri));
			});

			test("without a calendar nothing is snapped", () => {
				init(true, { deadlines: true });
				const { stored, shown } = enterDeadline(sat);
				expect(stored).to.eq(day(sun));
				expect(shown).to.eq(day(sat));
			});

			test("a loaded deadline is kept", () => {
				init(true, weekdays, { duration: 5, deadline: nextMon });
				const task = store.getTask(1);
				expect(day(task.deadline)).to.eq(day(nextMon));
			});
		});
	});
});
