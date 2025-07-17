import { expect, test } from "vitest";
import { DataStore } from "../src/index";
import { writable } from "svelte/store";
import { getData, summaryDates, summaryPrettyDates } from "./stubs/data";

function getDataStore(data) {
	const store = new DataStore(writable);
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
	expect(tasks.byId(4).data.length).to.eq(2);
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
	const store = getDataStore(getData("summaries"));
	const { tasks } = store.getState();

	expect(tasks.byId(14).start).toEqual(new Date(2024, 5, 14));
	expect(tasks.byId(14).end).toEqual(new Date(2024, 5, 21));

	store.in.exec("update-task", {
		id: 15,
		task: { unscheduled: true },
	});
	expect(tasks.byId(15).unscheduled).to.eq(true);

	expect(tasks.byId(14).start).toEqual(new Date(2024, 5, 15));
	expect(tasks.byId(14).end).toEqual(new Date(2024, 5, 21));

	store.in.exec("update-task", {
		id: 15,
		task: { unscheduled: false },
	});
	expect(tasks.byId(15).unscheduled).to.eq(false);

	store.in.exec("update-task", {
		id: 152,
		task: { unscheduled: true },
	});
	expect(tasks.byId(152).unscheduled).to.eq(true);

	expect(tasks.byId(14).start).toEqual(new Date(2024, 5, 14));
	expect(tasks.byId(14).end).toEqual(new Date(2024, 5, 21));
});

test("check dates of summary task if all kids are unscheduled, Default set", () => {
	const store = getDataStore(getData("summaries"));
	const { tasks } = store.getState();

	store.in.exec("delete-task", { id: 15 });
	expect(tasks.byId(14).start).toEqual(new Date(2024, 5, 21));
	expect(tasks.byId(14).end).toEqual(new Date(2024, 5, 21));

	store.in.exec("delete-task", { id: 17 });
	expect(tasks.byId(14).start).toEqual(new Date(2024, 5, 21));
	expect(tasks.byId(14).end).toEqual(new Date(2024, 5, 22));
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

test("does not allow to update summary dates separately, Default set", () => {
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
});

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
	expect(tasks.byId(1).end).toEqual(new Date(2024, 5, 22));

	store.in.exec("update-task", {
		id: 13,
		task: { start: new Date(2024, 5, 25) },
	});
	expect(tasks.byId(1).end).toEqual(new Date(2024, 5, 25));

	store.in.exec("move-task", { id: 13, mode: "before", target: 1 });
	expect(tasks.byId(1).end).toEqual(new Date(2024, 5, 22));

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
	let { tasks } = store.getState();

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
	let { tasks } = store.getState();

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
