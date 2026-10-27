import { expect, test } from "vitest";
import { DataStore, normalizeLinks, getDefaultColumns } from "../src/index";
import { writable } from "svelte/store";
import { getData, summaryDates, summaryPrettyDates } from "./stubs/data";

function getDataStore(data: any) {
	const store = new DataStore(writable);
	if (data.links) data.links = normalizeLinks(data.links);
	store.init({
		...data,
	});
	return store;
}

test("supports delete action, Default set", () => {
	const store = getDataStore(getData("summaries"));
	const { tasks, links } = store.getState();

	store.in.exec("delete-task", { id: 13 });
	expect(tasks.toArray().length).to.eq(16);
	expect(links.map(l => l).length).to.eq(7);

	store.in.exec("delete-task", { id: 12 });
	expect(tasks.toArray().length).to.eq(15);
	expect(links.map(l => l).length).to.eq(6);

	store.in.exec("delete-task", { id: 8 });
	expect(tasks.toArray().length).to.eq(8);
	expect(links.map(l => l).length).to.eq(2);

	expect(tasks.byId(1).start).toEqual(new Date(2024, 5, 14));
	expect(tasks.byId(1).end).toEqual(new Date(2024, 5, 16));

	store.in.exec("delete-link", { id: 2 });
	expect(links.map(l => l).length).to.eq(1);

	store.in.exec("delete-link", { id: 3 }); // does not exist
	expect(links.map(l => l).length).to.eq(1);
});

test("supports delete action, Pretty set", () => {
	const store = getDataStore(getData("pretty"));

	const { tasks, links } = store.getState();

	store.in.exec("delete-task", { id: 12 });
	expect(tasks.toArray().length).to.eq(18);
	expect(links.map(l => l).length).to.eq(6);

	store.in.exec("delete-task", { id: 11 });
	expect(tasks.toArray().length).to.eq(17);
	expect(links.map(l => l).length).to.eq(4);

	store.in.exec("delete-task", { id: 3 });
	expect(tasks.toArray().length).to.eq(13);
	expect(links.map(l => l).length).to.eq(4);

	expect(tasks.byId(1).start).toEqual(new Date(2024, 3, 2));
	expect(tasks.byId(1).end).toEqual(new Date(2024, 3, 5));

	store.in.exec("delete-link", { id: 4 });
	expect(links.map(l => l).length).to.eq(3);

	store.in.exec("delete-link", { id: 7 });
	expect(links.map(l => l).length).to.eq(2);
});

test("supports move task action, Default set", () => {
	const store = getDataStore(getData("summaries"));
	const { tasks } = store.getState();

	store.in.exec("move-task", { id: 5, mode: "up" });
	expect(tasks.byId(5).parent).to.eq(8);

	store.in.exec("move-task", { id: 5, mode: "down" });
	expect(tasks.byId(5).parent).to.eq(11);

	store.in.exec("move-task", { id: 13, mode: "after", target: 9 });
	expect(tasks.byId(13).parent).to.eq(7);

	store.in.exec("move-task", { id: 13, mode: "before", target: 6 });
	expect(tasks.byId(13).parent).to.eq(10);

	store.in.exec("move-task", { id: 8, mode: "before", target: 1 });
	expect(tasks.byId(8).parent).to.eq(0);
	expect(tasks.byId(1).start).toEqual(new Date(2024, 5, 14));
	expect(tasks.byId(1).end).toEqual(new Date(2024, 5, 16));
});

test("supports move task action, Pretty set", () => {
	const store = getDataStore(getData("pretty"));
	const { tasks } = store.getState();

	store.in.exec("move-task", { id: 5, mode: "up" });
	expect(tasks.byId(5).parent).to.eq(4);

	store.in.exec("move-task", { id: 5, mode: "down" });
	expect(tasks.byId(5).parent).to.eq(4);

	store.in.exec("move-task", { id: 12, mode: "after", target: 21 });
	expect(tasks.byId(12).parent).to.eq(2);

	store.in.exec("move-task", { id: 12, mode: "before", target: 30 });
	expect(tasks.byId(12).parent).to.eq(3);

	store.in.exec("move-task", { id: 40, mode: "before", target: 1 });
	expect(tasks.byId(40).parent).to.eq(0);
	expect(tasks.byId(4).start).toEqual(new Date(2024, 3, 15));

	store.in.exec("move-task", { id: 5, mode: "after", target: 40 });
	store.in.exec("move-task", { id: 43, mode: "after", target: 5 });
	expect(tasks.byId(4).data?.length).to.eq(2);
	expect(tasks.byId(4).end).toEqual(new Date(2024, 4, 15));
});

test("correctly resets new parent summary task after a task is moved in or out, Default set", () => {
	const store = getDataStore(getData("summaries"));
	const { tasks } = store.getState();

	store.in.exec("move-task", { id: 6, mode: "before", target: 5 });
	expect(tasks.byId(6).parent).to.eq(11);
	expect(tasks.byId(11).start).toEqual(new Date(2024, 5, 15));
	expect(tasks.byId(11).end).toEqual(new Date(2024, 5, 21));

	store.in.exec("move-task", { id: 4, mode: "before", target: 1 });
	expect(tasks.byId(4).parent).to.eq(0);
	expect(tasks.byId(8).start).toEqual(new Date(2024, 5, 14));
	expect(tasks.byId(8).end).toEqual(new Date(2024, 5, 21));
	expect(tasks.byId(1).start).toEqual(new Date(2024, 5, 14));
	expect(tasks.byId(1).end).toEqual(new Date(2024, 5, 21));

	store.in.exec("move-task", { id: 13, mode: "after", target: 9 });
	expect(tasks.byId(7).start).toEqual(new Date(2024, 5, 14));
	expect(tasks.byId(7).end).toEqual(new Date(2024, 5, 21));
});

test("correctly resets new parent summary task after a task is moved in or out, Pretty set", () => {
	const store = getDataStore(getData("pretty"));
	const { tasks } = store.getState();

	store.in.exec("move-task", { id: 10, mode: "before", target: 1 });
	expect(tasks.byId(10).parent).to.eq(0);
	expect(tasks.byId(1).start).toEqual(new Date(2024, 3, 5));

	store.in.exec("open-task", { id: 11, mode: true });
	store.in.exec("move-task", { id: 113, mode: "before", target: 1 });
	expect(tasks.byId(1).start).toEqual(new Date(2024, 3, 5));
	expect(tasks.byId(1).end).toEqual(new Date(2024, 3, 12));
});

test("correctly resets new parent summary task after all tasks are removed one by one, Default set", () => {
	const store = getDataStore(getData("summaries"));
	const { tasks, links } = store.getState();

	store.in.exec("delete-task", { id: 5 });
	expect(links.map(l => l).length).to.eq(6);
	expect(tasks.byId(11).start).toEqual(new Date(2024, 5, 20));
	expect(tasks.byId(11).end).toEqual(new Date(2024, 5, 21));

	store.in.exec("delete-task", { id: 12 });
	expect(links.map(l => l).length).to.eq(6);
	expect(tasks.byId(11).start).toEqual(new Date(2024, 5, 21));
	expect(tasks.byId(11).end).toEqual(new Date(2024, 5, 21));

	store.in.exec("delete-task", { id: 13 });
	expect(links.map(l => l).length).to.eq(6);
	expect(tasks.byId(11).start).toEqual(new Date(2024, 5, 21));
	expect(tasks.byId(11).end).toEqual(new Date(2024, 5, 21));
});

test("correctly resets new parent summary task after all tasks are removed one by one, Pretty set", () => {
	const store = getDataStore(getData("pretty"));
	const { tasks, links } = store.getState();

	store.in.exec("delete-task", { id: 10 });
	expect(links.map(l => l).length).to.eq(6);
	expect(tasks.byId(1).start).toEqual(new Date(2024, 3, 5));
	expect(tasks.byId(1).end).toEqual(new Date(2024, 3, 17));

	store.in.exec("delete-task", { id: 12 });
	expect(links.map(l => l).length).to.eq(5);
	expect(tasks.byId(1).start).toEqual(new Date(2024, 3, 5));
	expect(tasks.byId(1).end).toEqual(new Date(2024, 3, 17));

	store.in.exec("open-task", { id: 11, mode: true });
	store.in.exec("delete-task", { id: 113 });
	expect(links.map(l => l).length).to.eq(5);
	expect(tasks.byId(1).start).toEqual(new Date(2024, 3, 5));
	expect(tasks.byId(1).end).toEqual(new Date(2024, 3, 12));

	store.in.exec("delete-task", { id: 112 });
	expect(links.map(l => l).length).to.eq(5);
	expect(tasks.byId(1).start).toEqual(new Date(2024, 3, 5));
	expect(tasks.byId(1).end).toEqual(new Date(2024, 3, 9));

	store.in.exec("delete-task", { id: 11 });
	expect(links.map(l => l).length).to.eq(4);
	expect(tasks.byId(1).start).toEqual(new Date(2024, 3, 5));
	expect(tasks.byId(1).end).toEqual(new Date(2024, 3, 9));
});

test("correctly resets new parent summary task after all tasks are moved out one by one, Default set", () => {
	const store = getDataStore(getData("summaries"));
	const { tasks } = store.getState();

	store.in.exec("move-task", { id: 5, mode: "up" });
	expect(tasks.byId(11).start).toEqual(new Date(2024, 5, 20));
	expect(tasks.byId(11).end).toEqual(new Date(2024, 5, 21));

	store.in.exec("move-task", { id: 12, mode: "up" });
	expect(tasks.byId(11).start).toEqual(new Date(2024, 5, 21));
	expect(tasks.byId(11).end).toEqual(new Date(2024, 5, 21));

	store.in.exec("move-task", { id: 13, mode: "up" });
	expect(tasks.byId(11).start).toEqual(new Date(2024, 5, 21));
	expect(tasks.byId(11).end).toEqual(new Date(2024, 5, 21));
});

test("sets summary dates only for scheduled children, Default set", () => {
	const data = { ...getData("summaries") };
	data.tasks = data.tasks.map(t => {
		t = { ...t };
		if (t.id === 151 || t.id === 16) delete t.start;
		return t;
	});
	const store = getDataStore({
		...data,
		unscheduledTasks: true,
	});
	const { tasks } = store.getState();

	expect(tasks.byId(14).start).toEqual(new Date(2024, 5, 14));
	expect(tasks.byId(14).end).toEqual(new Date(2024, 5, 21));

	store.in.exec("update-task", {
		id: 15,
		task: { start: null },
	});
	expect(tasks.byId(15).unscheduled).to.eq(true);

	expect(tasks.byId(14).start).toEqual(new Date(2024, 5, 15));
	expect(tasks.byId(14).end).toEqual(new Date(2024, 5, 21));

	store.in.exec("update-task", {
		id: 15,
		task: { start: new Date(2024, 5, 15) },
	});
	expect(tasks.byId(15).unscheduled).to.eq(false);

	store.in.exec("update-task", {
		id: 152,
		task: { start: null },
	});
	expect(tasks.byId(152).unscheduled).to.eq(true);

	expect(tasks.byId(14).start).toEqual(new Date(2024, 5, 15));
	expect(tasks.byId(14).end).toEqual(new Date(2024, 5, 21));
});

test("check dates of summary task if all kids are unscheduled, Default set", () => {
	const data = { ...getData("summaries") };
	data.tasks = data.tasks.map(t => {
		t = { ...t };
		if (t.id === 151 || t.id === 16) delete t.start;
		return t;
	});
	const store = getDataStore({
		...data,
		unscheduledTasks: true,
	});
	const { tasks } = store.getState();

	store.in.exec("delete-task", { id: 15 });
	expect(tasks.byId(14).start).toEqual(new Date(2024, 5, 21));
	expect(tasks.byId(14).end).toEqual(new Date(2024, 5, 21));

	store.in.exec("delete-task", { id: 17 });
	expect(tasks.byId(14).start).to.eq(null);
	expect(tasks.byId(14).end).to.eq(null);
	expect(tasks.byId(14).duration).to.eq(null);
	expect(tasks.byId(14).unscheduled).to.eq(true);
});

test("correctly resets new parent summary task after all tasks are moved out one by one, Pretty set", () => {
	const store = getDataStore(getData("pretty"));
	const { tasks } = store.getState();

	store.in.exec("move-task", { id: 10, mode: "up" });
	expect(tasks.byId(1).start).toEqual(new Date(2024, 3, 5));
	expect(tasks.byId(1).end).toEqual(new Date(2024, 3, 17));

	store.in.exec("move-task", { id: 12, mode: "up" });
	store.in.exec("move-task", { id: 12, mode: "up" });
	expect(tasks.byId(1).start).toEqual(new Date(2024, 3, 5));
	expect(tasks.byId(1).end).toEqual(new Date(2024, 3, 17));

	store.in.exec("open-task", { id: 11, mode: true });
	store.in.exec("move-task", { id: 113, mode: "down" });
	store.in.exec("move-task", { id: 113, mode: "down" });
	expect(tasks.byId(1).start).toEqual(new Date(2024, 3, 5));
	expect(tasks.byId(1).end).toEqual(new Date(2024, 3, 12));

	store.in.exec("move-task", { id: 112, mode: "down" });
	store.in.exec("move-task", { id: 112, mode: "down" });
	expect(tasks.byId(1).start).toEqual(new Date(2024, 3, 5));
	expect(tasks.byId(1).end).toEqual(new Date(2024, 3, 9));

	store.in.exec("move-task", { id: 11, mode: "down" });
	expect(tasks.byId(1).start).toEqual(new Date(2024, 3, 5));
	expect(tasks.byId(1).end).toEqual(new Date(2024, 3, 9));
});

test("supports update task action and correctly resets related summary tasks, Default set", () => {
	const store = getDataStore(getData("summaries"));
	const { tasks } = store.getState();

	store.in.exec("update-task", {
		id: 1,
		task: { text: "Project 1", details: "The main summary task" },
	});
	expect(tasks.byId(1).text).to.eq("Project 1");
	expect(tasks.byId(1).details).to.eq("The main summary task");

	store.in.exec("update-task", { id: 8, task: { progress: 23 } });
	expect(tasks.byId(8).progress).to.eq(23);
	expect(tasks.byId(1).progress).to.eq(0);

	store.in.exec("update-task", {
		id: 3,
		task: { start: new Date(2024, 5, 12) },
	});
	expect(tasks.byId(1).start).toEqual(new Date(2024, 5, 12));
	expect(tasks.byId(7).start).toEqual(new Date(2024, 5, 12));

	store.in.exec("update-task", {
		id: 11,
		task: { start: new Date(2024, 5, 13), end: new Date(2024, 5, 15) },
	});
	expect(tasks.byId(1).start).toEqual(new Date(2024, 5, 12));
	expect(tasks.byId(8).start).toEqual(new Date(2024, 5, 13));
	expect(tasks.byId(1).end).toEqual(new Date(2024, 5, 19));
	expect(tasks.byId(8).end).toEqual(new Date(2024, 5, 19));

	store.in.exec("update-task", {
		id: 12,
		task: { start: new Date(2024, 5, 20), end: new Date(2024, 5, 25) },
	});
	expect(tasks.byId(1).end).toEqual(new Date(2024, 5, 25));
	expect(tasks.byId(8).end).toEqual(new Date(2024, 5, 25));
	expect(tasks.byId(11).end).toEqual(new Date(2024, 5, 25));
});

test("supports update task action and correctly resets related summary tasks, Pretty set", () => {
	const store = getDataStore(getData("pretty"));
	const { tasks } = store.getState();

	store.in.exec("update-task", {
		id: 10,
		task: { start: new Date(2024, 3, 10) },
	});
	expect(tasks.byId(1).start).toEqual(new Date(2024, 3, 5));

	store.in.exec("update-task", {
		id: 11,
		task: { start: new Date(2024, 3, 10), end: new Date(2024, 3, 15) },
	});
	expect(tasks.byId(1).start).toEqual(new Date(2024, 3, 6));
	expect(tasks.byId(1).end).toEqual(new Date(2024, 3, 17));

	store.in.exec("update-task", {
		id: 12,
		task: {
			type: "task",
			start: new Date(2024, 3, 20),
			end: new Date(2024, 3, 25),
		},
	});
	expect(tasks.byId(1).end).toEqual(new Date(2024, 3, 25));

	store.in.exec("update-task", {
		id: 12,
		task: { start: new Date(2024, 3, 15), end: new Date(2024, 3, 20) },
	});
	expect(tasks.byId(1).end).toEqual(new Date(2024, 3, 20));

	store.in.exec("update-task", {
		id: 12,
		task: { start: new Date(2024, 3, 10), end: new Date(2024, 3, 15) },
	});
	expect(tasks.byId(1).end).toEqual(new Date(2024, 3, 17));

	store.in.exec("update-task", {
		id: 12,
		task: { start: new Date(2024, 3, 5), end: new Date(2024, 3, 10) },
	});
	expect(tasks.byId(1).start).toEqual(new Date(2024, 3, 5));
	expect(tasks.byId(1).end).toEqual(new Date(2024, 3, 17));

	store.in.exec("update-task", {
		id: 113,
		task: { start: new Date(2024, 3, 10), end: new Date(2024, 3, 12) },
	});
	expect(tasks.byId(1).start).toEqual(new Date(2024, 3, 5));
	expect(tasks.byId(1).end).toEqual(new Date(2024, 3, 15));
});
/* eslint-disable vitest/no-commented-out-tests */
/*test("does not allow to update summary dates separately, Default set", () => {
	const store = getDataStore(getData("summaries"));
	const { tasks } = store.getState();

	store.in.exec("update-task", {
		id: 11,
		task: { start: new Date(2024, 5, 20), end: new Date(2024, 5, 24) },
	});
	expect(tasks.byId(11).start).toEqual(new Date(2024, 5, 19));
	expect(tasks.byId(11).end).toEqual(new Date(2024, 5, 21));

	store.in.exec("update-task", {
		id: 11,
		task: { start: new Date(2024, 5, 14) },
	});
	expect(tasks.byId(11).start).toEqual(new Date(2024, 5, 19));
	expect(tasks.byId(11).end).toEqual(new Date(2024, 5, 21));

	store.in.exec("update-task", {
		id: 11,
		task: { end: new Date(2024, 5, 20) },
	});

	expect(tasks.byId(11).start).toEqual(new Date(2024, 5, 19));
	expect(tasks.byId(11).end).toEqual(new Date(2024, 5, 21));

	store.in.exec("update-task", {
		id: 11,
		task: { duration: 5 },
	});
	expect(tasks.byId(11).start).toEqual(new Date(2024, 5, 19));
	expect(tasks.byId(11).end).toEqual(new Date(2024, 5, 21));
});*/

test("supports indent task action and resets related summary task dates, Default set", () => {
	const store = getDataStore(getData("summaries"));
	const { tasks } = store.getState();

	store.in.exec("indent-task", { id: 8, mode: true });
	expect(tasks.byId(8).parent).to.eq(7);
	expect(tasks.byId(7).start).toEqual(new Date(2024, 5, 13));
	expect(tasks.byId(7).end).toEqual(new Date(2024, 5, 21));

	store.in.exec("indent-task", { id: 8, mode: false });
	expect(tasks.byId(8).parent).to.eq(1);
	expect(tasks.byId(7).start).toEqual(new Date(2024, 5, 14));
	expect(tasks.byId(7).end).toEqual(new Date(2024, 5, 16));
});

test("supports copy task action and resets related summary task dates, Default set", () => {
	const store = getDataStore(getData("summaries"));
	const { tasks } = store.getState();

	store.in.exec("copy-task", { id: 13, mode: "after", target: 9 });
	expect(tasks.byId(7).start).toEqual(new Date(2024, 5, 14));
	expect(tasks.byId(7).end).toEqual(new Date(2024, 5, 21));

	store.in.exec("copy-task", { id: 7, mode: "after", target: 12 });
	expect(tasks.byId(11).start).toEqual(new Date(2024, 5, 14));
	expect(tasks.byId(11).end).toEqual(new Date(2024, 5, 21));
});

test("supports inProgress move-task operation and resets related summary task dates, Default set", () => {
	const store = getDataStore(getData("summaries"));
	const { tasks } = store.getState();

	store.in.exec("move-task", {
		id: 5,
		mode: "before",
		target: 11,
		inProgress: true,
	});
	expect(tasks.byId(11).start).toEqual(new Date(2024, 5, 20));

	store.in.exec("move-task", {
		id: 4,
		mode: "before",
		target: 8,
		inProgress: true,
	});
	expect(tasks.byId(8).start).toEqual(new Date(2024, 5, 14));

	store.in.exec("move-task", {
		id: 4,
		mode: "before",
		target: 1,
		inProgress: true,
	});
	expect(tasks.byId(1).start).toEqual(new Date(2024, 5, 14));

	store.in.exec("move-task", {
		id: 4,
		mode: "before",
		target: 7,
		inProgress: true,
	});
	expect(tasks.byId(1).start).toEqual(new Date(2024, 5, 13));

	store.in.exec("move-task", {
		id: 4,
		mode: "before",
		target: 10,
		inProgress: true,
	});
	expect(tasks.byId(8).start).toEqual(new Date(2024, 5, 13));

	store.in.exec("move-task", {
		id: 4,
		mode: "before",
		target: 12,
		inProgress: true,
	});
	expect(tasks.byId(11).start).toEqual(new Date(2024, 5, 13));
});

test("a reorder drag keeps summary updates in progress until drop", () => {
	const store = getDataStore(getData("summaries"));
	const { tasks } = store.getState();
	const updates: any[] = [];
	store.in.on("update-task", (ev: any) => updates.push(ev));

	store.in.exec("move-task", {
		id: 4,
		mode: "before",
		target: 3,
		inProgress: true,
	});
	expect(tasks.byId(4).parent).to.eq(7);
	expect(updates.length).to.be.greaterThan(0);
	updates.forEach(ev => {
		expect(ev.inProgress).to.eq(true);
		expect(ev.skipProvider).to.eq(true);
	});

	store.in.exec("move-task", {
		id: 4,
		mode: "before",
		target: 5,
		inProgress: true,
	});
	expect(tasks.byId(4).parent).to.eq(11);
	updates.forEach(ev => {
		expect(ev.inProgress).to.eq(true);
		expect(ev.skipProvider).to.eq(true);
	});

	updates.length = 0;
	store.in.exec("move-task", {
		id: 4,
		mode: "before",
		target: 5,
		inProgress: false,
	});

	// 7 and 8 changed during the drag but are back to their original dates
	expect(updates.map(ev => ev.id)).toEqual([11]);
	updates.forEach(ev => {
		expect(ev.inProgress).to.eq(undefined);
		expect(ev.skipProvider).to.eq(undefined);
		expect(ev.eventSource).to.eq("move-task");
		expect(ev.skipUndo).to.eq(undefined);
		expect(ev.task.start).toEqual(tasks.byId(ev.id).start);
		expect(ev.task.end).toEqual(tasks.byId(ev.id).end);
	});
	expect(tasks.byId(11).start).toEqual(new Date(2024, 5, 13));
	expect(tasks.byId(11).end).toEqual(new Date(2024, 5, 21));
	[1, 7, 8].forEach(id => {
		expect(tasks.byId(id).start).toEqual(summaryDates[id].start);
		expect(tasks.byId(id).end).toEqual(summaryDates[id].end);
	});
});

test("a reorder drag dropped back where it started sends no summary updates", () => {
	const store = getDataStore(getData("summaries"));
	const { tasks } = store.getState();
	const updates: any[] = [];
	store.in.on("update-task", (ev: any) => updates.push(ev));

	store.in.exec("move-task", {
		id: 4,
		mode: "before",
		target: 3,
		inProgress: true,
	});
	store.in.exec("move-task", {
		id: 4,
		mode: "before",
		target: 10,
		inProgress: true,
	});

	updates.length = 0;
	store.in.exec("move-task", {
		id: 4,
		mode: "before",
		target: 10,
		inProgress: false,
	});

	expect(tasks.byId(4).parent).to.eq(8);
	expect(updates).toEqual([]);
	[1, 7, 8].forEach(id => {
		expect(tasks.byId(id).start).toEqual(summaryDates[id].start);
		expect(tasks.byId(id).end).toEqual(summaryDates[id].end);
	});
});

test("a reorder drag among siblings sends no summary updates", () => {
	const store = getDataStore(getData("summaries"));
	const updates: any[] = [];
	store.in.on("update-task", (ev: any) => updates.push(ev));

	store.in.exec("move-task", {
		id: 9,
		mode: "before",
		target: 3,
		inProgress: true,
	});
	store.in.exec("move-task", {
		id: 9,
		mode: "before",
		target: 3,
		inProgress: false,
	});

	expect(store.getState().tasks.byId(9).parent).to.eq(7);
	expect(updates).toEqual([]);
});

test("drag-time summary progress updates skip the provider too", () => {
	const store = getDataStore({
		...getData("summaries"),
		summary: { autoProgress: true },
	});
	const updates: any[] = [];
	store.in.on("update-task", (ev: any) => updates.push(ev));

	store.in.exec("move-task", {
		id: 4,
		mode: "before",
		target: 15,
		inProgress: true,
	});
	expect(updates.some(ev => ev.id === 1 && "progress" in ev.task)).to.eq(
		true
	);
	updates.forEach(ev => {
		expect(ev.inProgress).to.eq(true);
		expect(ev.skipProvider).to.eq(true);
	});

	updates.length = 0;
	store.in.exec("move-task", {
		id: 4,
		mode: "before",
		target: 15,
		inProgress: false,
	});
	expect(updates.length).to.be.greaterThan(0);
	updates.forEach(ev => {
		expect(ev.inProgress).to.eq(undefined);
		expect(ev.skipProvider).to.eq(undefined);
	});
});

test("a move that is not a drag sends summary updates without inProgress", () => {
	const store = getDataStore(getData("summaries"));
	const updates: any[] = [];
	store.in.on("update-task", (ev: any) => updates.push(ev));

	store.in.exec("move-task", { id: 4, mode: "before", target: 1 });

	expect(updates.map(ev => ev.id)).toEqual([8, 1]);
	updates.forEach(ev => expect(ev.inProgress).to.eq(undefined));
});

test("supports drag-task operation and resets related summary task dates, Default set", () => {
	const store = getDataStore({ ...getData("summaries"), cellWidth: 30 });
	const { tasks, cellWidth } = store.getState();

	expect(cellWidth).to.eq(30);

	store.in.exec("drag-task", { id: 5, left: 30 });
	expect(tasks.byId(5).$x).toEqual(30);
	expect(tasks.byId(11).$x).toEqual(30);
	expect(tasks.byId(8).$x).toEqual(30);
	expect(tasks.byId(1).$x).toEqual(30);

	store.in.exec("drag-task", { id: 5, left: 60 });
	expect(tasks.byId(5).$x).toEqual(60);
	expect(tasks.byId(11).$x).toEqual(60);
	expect(tasks.byId(8).$x).toEqual(60);
	expect(tasks.byId(1).$x).toEqual(60);

	store.in.exec("drag-task", { id: 5, left: 300 });
	expect(tasks.byId(5).$x).toEqual(300);
	expect(tasks.byId(11).$w).toEqual(120);
	expect(tasks.byId(8).$w).toEqual(240);
	expect(tasks.byId(1).$w).toEqual(240);

	store.in.exec("drag-task", { id: 5, width: 90 });
	expect(tasks.byId(5).$w).toEqual(90);
	expect(tasks.byId(11).$w).toEqual(120);
	expect(tasks.byId(8).$w).toEqual(240);
	expect(tasks.byId(1).$w).toEqual(240);
});

test("sets summary task dates from kids when no dates are provided in initial data, Default set", () => {
	const store = getDataStore(getData("summaries"));
	const { tasks } = store.getState();

	const ps = [1, 7, 8, 11];
	for (let i = 0; i < ps.length; i++) {
		const id = ps[i];
		const p = tasks.byId(id);
		expect(p.start).toEqual(summaryDates[id].start);
		expect(p.end).toEqual(summaryDates[id].end);
	}
});

test("sets summary task dates from kids when no dates are provided in initial data, Pretty set", () => {
	const store = getDataStore(getData("pretty"));
	const { tasks } = store.getState();

	const ps = [1, 2, 3, 4];
	for (let i = 0; i < ps.length; i++) {
		const id = ps[i];
		const p = tasks.byId(id);
		expect(p.start).toEqual(summaryPrettyDates[id].start);
		expect(p.end).toEqual(summaryPrettyDates[id].end);
	}
});

test("correctly resets summary task dates when it's milestones are changed in any way, Default set", () => {
	const store = getDataStore(getData("summaries"));
	const { tasks } = store.getState();

	store.in.exec("add-task", {
		task: {
			text: "Milestone 1",
			parent: 1,
			start: new Date(2024, 5, 22),
		},
	});
	expect(tasks.byId(1).end).toEqual(new Date(2024, 5, 23));

	store.in.exec("update-task", {
		id: 13,
		task: { start: new Date(2024, 5, 25) },
	});
	expect(tasks.byId(1).end).toEqual(new Date(2024, 5, 25));

	store.in.exec("move-task", { id: 13, mode: "before", target: 1 });
	expect(tasks.byId(1).end).toEqual(new Date(2024, 5, 23));

	store.in.exec("copy-task", { id: 13, mode: "before", target: 3 });
	expect(tasks.byId(7).end).toEqual(new Date(2024, 5, 25));
	expect(tasks.byId(1).end).toEqual(new Date(2024, 5, 25));

	store.in.exec("move-task", { id: 13, mode: "before", target: 5 });
	expect(tasks.byId(11).end).toEqual(new Date(2024, 5, 25));
	store.in.exec("delete-task", { id: 13 });
	expect(tasks.byId(11).end).toEqual(new Date(2024, 5, 21));
});

test("correctly resets summary task and kids dates and coordinates after complex update action sequences, Default set", () => {
	const store = getDataStore(getData("summaries"));
	const { tasks } = store.getState();

	store.in.exec("update-task", {
		id: 11,
		task: { start: new Date(2024, 5, 16), end: new Date(2024, 5, 18) },
	});
	expect(tasks.byId(11).start).toEqual(new Date(2024, 5, 16));
	expect(tasks.byId(5).start).toEqual(new Date(2024, 5, 16));
	expect(tasks.byId(12).start).toEqual(new Date(2024, 5, 17));
	expect(tasks.byId(13).start).toEqual(new Date(2024, 5, 18));

	store.in.exec("update-task", {
		id: 13,
		task: { start: new Date(2024, 5, 21) },
	});
	expect(tasks.byId(11).end).toEqual(new Date(2024, 5, 21));

	store.in.exec("update-task", {
		id: 12,
		task: { end: new Date(2024, 5, 23) },
	});
	expect(tasks.byId(11).end).toEqual(new Date(2024, 5, 23));

	store.in.exec("update-task", {
		id: 12,
		task: { start: new Date(2024, 5, 15), end: new Date(2024, 5, 21) },
	});
	expect(tasks.byId(12).start).toEqual(new Date(2024, 5, 15));
	expect(tasks.byId(12).end).toEqual(new Date(2024, 5, 21));
	expect(tasks.byId(11).start).toEqual(new Date(2024, 5, 15));
	expect(tasks.byId(11).end).toEqual(new Date(2024, 5, 21));

	store.in.exec("update-task", {
		id: 12,
		task: { end: new Date(2024, 5, 19) },
	});
	expect(tasks.byId(12).end).toEqual(new Date(2024, 5, 19));
	expect(tasks.byId(11).end).toEqual(new Date(2024, 5, 21));
});

test("correctly update summary task to task type task and back, Default set", () => {
	const store = getDataStore(getData("summaries"));
	const { tasks } = store.getState();

	store.in.exec("update-task", {
		id: 1,
		task: {
			type: "task",
			start: new Date(2024, 5, 11),
			end: new Date(2024, 5, 23),
		},
	});

	expect(tasks.byId(1).type).to.eq("task");
	expect(tasks.byId(1).start).toEqual(new Date(2024, 5, 11));
	expect(tasks.byId(1).end).toEqual(new Date(2024, 5, 23));

	store.in.exec("update-task", {
		id: 1,
		task: { type: "summary" },
	});

	expect(tasks.byId(1).type).to.eq("summary");
	expect(tasks.byId(1).start).toEqual(new Date(2024, 5, 13));
	expect(tasks.byId(1).end).toEqual(new Date(2024, 5, 21));
});

test("correctly update summary task to task milestone task and back, Default set", () => {
	const store = getDataStore(getData("summaries"));
	const { tasks } = store.getState();

	store.in.exec("update-task", {
		id: 1,
		task: { type: "milestone" },
	});

	expect(tasks.byId(1).type).to.eq("milestone");
	expect(tasks.byId(1).start).toEqual(new Date(2024, 5, 13));
	expect(tasks.byId(1).end).to.be.undefined;

	store.in.exec("update-task", {
		id: 1,
		task: { type: "summary" },
	});

	expect(tasks.byId(1).type).to.eq("summary");
	expect(tasks.byId(1).start).toEqual(new Date(2024, 5, 13));
	expect(tasks.byId(1).end).toEqual(new Date(2024, 5, 21));
});

// Regression: schedule auto + autoProgress
test("auto schedule + autoProgress does not loop", () => {
	const tasks = [
		{
			id: 1,
			text: "S",
			type: "summary",
			parent: 0,
			open: true,
			start: new Date(2024, 3, 1),
			end: new Date(2024, 3, 10),
			progress: 0,
		},
		{
			id: 10,
			text: "a",
			type: "task",
			parent: 1,
			start: new Date(2024, 3, 1),
			end: new Date(2024, 3, 3),
			progress: 50,
		},
		{
			id: 11,
			text: "b",
			type: "task",
			parent: 1,
			start: new Date(2024, 3, 1),
			end: new Date(2024, 3, 3),
			progress: 0,
		},
	];
	const links = [{ id: 1, source: 10, target: 11, type: "e2s" }];

	const store = new DataStore(writable);
	let scheduleRuns = 0;
	// bound runaway so a regression fails fast instead of hanging the suite
	(store as any).in.intercept("schedule-tasks", () => {
		if (++scheduleRuns > 100) throw new Error("scheduling loop");
	});

	store.init({
		tasks,
		links: normalizeLinks(links),
		columns: getDefaultColumns({ resources: false, wbs: false }),
		scales: [{ unit: "day", step: 1, format: "%j" }],
		cellWidth: 80,
		cellHeight: 38,
		scaleHeight: 36,
		schedule: { auto: true },
		summary: { autoProgress: true },
	} as any);

	expect(scheduleRuns).toBeLessThan(10);
});

test("toggling inactiveTasks rolls up every summary without an undo step", () => {
	const config = {
		...getData(),
		undo: true,
		summary: { autoProgress: true },
		tasks: [
			{ id: 1, text: "Release", type: "summary", parent: 0, open: true },
			{
				id: 2,
				text: "QA",
				type: "task",
				parent: 1,
				start: new Date(2024, 3, 1),
				duration: 2,
				progress: 50,
			},
			{
				id: 3,
				text: "Regression",
				type: "task",
				parent: 1,
				start: new Date(2024, 3, 3),
				duration: 2,
				progress: 100,
				inactive: true,
			},
		],
		links: [],
	};
	const store = getDataStore(config);

	store.init({ ...config, inactiveTasks: true });
	expect(store.getState().tasks.byId(1).progress).to.eq(50);

	store.init({ ...config, inactiveTasks: false });
	expect(store.getState().tasks.byId(1).progress).to.eq(75);
	expect(store.getState().history).to.deep.eq({ undo: 0, redo: 0 });
});

test("sets summary dates from all children when unscheduledTasks is disabled, Default set", () => {
	const store = getDataStore({
		...getData(),
		unscheduledTasks: false,
		tasks: [
			{
				id: 1,
				text: "Summary",
				type: "summary",
				parent: 0,
				open: true,
			},
			{
				id: 2,
				text: "Scheduled kid",
				type: "task",
				parent: 1,
				start: new Date(2024, 5, 14),
				end: new Date(2024, 5, 16),
				duration: 2,
			},
			{
				id: 3,
				text: "Kid with unscheduled flag",
				type: "task",
				parent: 1,
				start: new Date(2024, 5, 10),
				end: new Date(2024, 5, 12),
				duration: 2,
				unscheduled: true, // this kid should not be ignored as unscheduledTasks is false
			},
		],
		links: [],
	});
	const { tasks } = store.getState();

	expect(tasks.byId(1).start).toEqual(new Date(2024, 5, 10));
	expect(tasks.byId(1).end).toEqual(new Date(2024, 5, 16));
});

test("ignores a summary's own duration when its dates come from kids, Default set", () => {
	const store = getDataStore({
		...getData(),
		tasks: [
			{ id: 1, text: "Summary", type: "summary", duration: 5 },
			{
				id: 2,
				text: "Kid",
				type: "task",
				parent: 1,
				start: new Date(2024, 5, 10),
				end: new Date(2024, 5, 12),
			},
		],
		links: [],
	});
	const { tasks } = store.getState();

	expect(tasks.byId(1).start).toEqual(new Date(2024, 5, 10));
	expect(tasks.byId(1).end).toEqual(new Date(2024, 5, 12));
	expect(tasks.byId(1).duration).toEqual(2);
});

test("autoConvert turns an emptied summary back into a task when its last child moves inside another task", () => {
	const store = getDataStore({
		...getData(),
		summary: { autoConvert: true },
		tasks: [
			{
				id: 1,
				text: "QA",
				type: "summary",
				parent: 0,
				open: true,
				start: new Date(2024, 3, 2),
				end: new Date(2024, 3, 4),
				duration: 2,
			},
			{
				id: 2,
				text: "Regression",
				type: "task",
				parent: 1,
				start: new Date(2024, 3, 2),
				end: new Date(2024, 3, 4),
				duration: 2,
			},
			{
				id: 3,
				text: "Build",
				type: "task",
				parent: 0,
				start: new Date(2024, 3, 6),
				end: new Date(2024, 3, 8),
				duration: 2,
			},
		],
		links: [],
	});
	store.in.exec("move-task", { id: 2, target: 3, mode: "child" });
	const tasks = store.getState().tasks;
	expect(tasks.byId(2).parent).to.eq(3);
	expect(tasks.byId(3).type).to.eq("summary");
	expect(tasks.byId(1).type).to.eq("task");
});

test("toggling inactiveTasks publishes the rolled-up summary progress", () => {
	const data = {
		...getData(),
		summary: { autoProgress: true },
		inactiveTasks: false,
		tasks: [
			{
				id: 1,
				text: "Release",
				type: "summary",
				parent: 0,
				open: true,
				progress: 50,
			},
			{
				id: 2,
				text: "QA",
				type: "task",
				parent: 1,
				start: new Date(2024, 3, 2),
				duration: 2,
				progress: 0,
			},
			{
				id: 3,
				text: "Regression",
				type: "task",
				parent: 1,
				start: new Date(2024, 3, 4),
				duration: 2,
				progress: 100,
				inactive: true,
			},
		],
		links: [],
	};
	const store = getDataStore(data);

	store.init({ ...data, inactiveTasks: true });

	// bars read _tasks, which stays at 50 until the new progress is published
	const rows = store.getState()._tasks;
	expect(rows.find(task => task.id === 1).progress).to.eq(0);
});
