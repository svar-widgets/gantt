import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { getData } from "./stubs/data";
import { writable } from "./stubs/writable";
import { DataStore, normalizeLinks } from "../src/index";
import { IAssignment, ILink, IParsedTask, TID } from "../src/types";

let store: DataStore;

function resetState(data?: any) {
	if (!data) data = getData();
	if (data.links) data.links = normalizeLinks(data.links);
	store = new DataStore(writable);
	store.init({ ...data });
}

describe("history", () => {
	describe("can set state history correctly", () => {
		test("after single actions", () => {
			const initData = getData();
			resetState({
				...initData,
				undo: true,
			});

			store.in.exec("add-task", { id: 7, task: {} });
			store.in.exec("add-link", {
				link: {
					id: 3,
					source: 1,
					target: 7,
					type: "e2s",
				},
			});

			let { history } = store.getState();

			expect(history).to.deep.eq({
				undo: 2,
				redo: 0,
			});

			store.in.exec("undo");
			({ history } = store.getState());
			expect(history).to.deep.eq({
				undo: 1,
				redo: 1,
			});

			store.in.exec("undo");
			({ history } = store.getState());
			expect(history).to.deep.eq({
				undo: 0,
				redo: 2,
			});

			store.in.exec("redo");
			({ history } = store.getState());
			expect(history).to.deep.eq({
				undo: 1,
				redo: 1,
			});

			store.in.exec("redo");
			({ history } = store.getState());
			expect(history).to.deep.eq({
				undo: 2,
				redo: 0,
			});
		});

		test("after actions that triggers actions for children and links", () => {
			const initData = getData("full");
			resetState({
				...initData,
				undo: true,
			});

			store.in.exec("copy-task", { id: 11, target: 2 });

			let { history } = store.getState();
			expect(history).to.deep.eq({
				undo: 1,
				redo: 0,
			});

			store.in.exec("delete-task", { id: 11 });

			({ history } = store.getState());
			expect(history).to.deep.eq({
				undo: 2,
				redo: 0,
			});

			store.in.exec("undo");
			store.in.exec("undo");
			({ history } = store.getState());
			expect(history).to.deep.eq({
				undo: 0,
				redo: 2,
			});

			store.in.exec("redo");
			({ history } = store.getState());
			expect(history).to.deep.eq({
				undo: 1,
				redo: 1,
			});
		});
	});

	describe("update-task", () => {
		test("can undo/redo after updating task", () => {
			const initData = getData();
			resetState({
				...initData,
				undo: true,
			});

			const { tasks } = store.getState();

			store.in.exec("update-task", {
				id: 1,
				task: { text: "some text" },
			});
			store.in.exec("update-task", {
				id: 2,
				task: {
					text: "some new text",
					start: new Date(2024, 3, 7),
					end: new Date(2024, 3, 10),
				},
			});

			store.in.exec("undo");
			expect(tasks.byId(2).duration).to.eq(2);
			expect(tasks.byId(2).text).to.eq("Task 2");
			expect(tasks.byId(1).text).to.eq("some text");

			store.in.exec("undo");
			expect(tasks.byId(1).text).to.eq("Task 1");

			store.in.exec("redo");
			store.in.exec("redo");
			expect(tasks.byId(2).duration).to.eq(3);
			expect(tasks.byId(2).text).to.eq("some new text");
			expect(tasks.byId(1).text).to.eq("some text");
		});

		test("can undo/redo after updating task (summaries tasks)", () => {
			const initData = getData("summaries");
			resetState({
				...initData,
				undo: true,
			});

			const { tasks } = store.getState();

			store.in.exec("update-task", {
				id: 9,
				task: {
					text: "some text",
					start: new Date(new Date(2024, 5, 15)),
					duration: 3,
				},
			});
			store.in.exec("update-task", {
				id: 9,
				task: {
					text: "some new text",
					start: new Date(new Date(2024, 5, 15)),
					end: new Date(new Date(2024, 5, 28)),
					progress: 50,
				},
			});

			store.in.exec("undo");
			expect(tasks.byId(1).duration).to.eq(8);
			expect(tasks.byId(7).duration).to.eq(4);
			expect(tasks.byId(9).duration).to.eq(3);
			expect(tasks.byId(9).text).to.eq("some text");
			expect(tasks.byId(9).progress).to.eq(0);

			store.in.exec("undo");
			expect(tasks.byId(1).duration).to.eq(8);
			expect(tasks.byId(7).duration).to.eq(2);
			expect(tasks.byId(9).duration).to.eq(1);
			expect(tasks.byId(9).text).to.eq("[9] Mini p task 2");
			expect(tasks.byId(9).progress).to.eq(0);

			store.in.exec("redo");
			expect(tasks.byId(1).duration).to.eq(8);
			expect(tasks.byId(7).duration).to.eq(4);
			expect(tasks.byId(9).duration).to.eq(3);
			expect(tasks.byId(9).text).to.eq("some text");
			expect(tasks.byId(9).progress).to.eq(0);

			store.in.exec("redo");
			expect(tasks.byId(1).duration).to.eq(15);
			expect(tasks.byId(7).duration).to.eq(14);
			expect(tasks.byId(9).duration).to.eq(13);
			expect(tasks.byId(9).text).to.eq("some new text");
			expect(tasks.byId(9).progress).to.eq(50);
		});

		test("can undo/redo after updating task (summaries tasks) 2", () => {
			const initData = getData("summaries");
			resetState({
				...initData,
				undo: true,
			});

			const { tasks } = store.getState();

			// delete task for more understandable changes in the summary task
			store.in.exec("delete-task", { id: 11 });
			expect(tasks.byId(8).duration).to.eq(6);
			expect(tasks.byId(8).start).to.deep.eq(new Date(2024, 5, 13));
			expect(tasks.byId(8).end).to.deep.eq(new Date(2024, 5, 19));

			// update child to see how child and summary task change
			store.in.exec("update-task", {
				id: 6,
				task: {
					type: "milestone",
				},
			});

			store.in.exec("undo");
			expect(tasks.byId(6).duration).to.eq(4);
			expect(tasks.byId(6).type).to.eq("task");
			expect(tasks.byId(6).start).to.deep.eq(new Date(2024, 5, 15));
			expect(tasks.byId(6).end).to.deep.eq(new Date(2024, 5, 19));
			expect(tasks.byId(8).duration).to.eq(6);
			expect(tasks.byId(8).start).to.deep.eq(new Date(2024, 5, 13));
			expect(tasks.byId(8).end).to.deep.eq(new Date(2024, 5, 19));

			store.in.exec("redo");
			expect(tasks.byId(6).duration).to.eq(0);
			expect(tasks.byId(6).type).to.eq("milestone");
			expect(tasks.byId(6).start).to.deep.eq(new Date(2024, 5, 15));
			expect(tasks.byId(6).end).to.eq(undefined);
			expect(tasks.byId(8).duration).to.eq(4);
			expect(tasks.byId(8).start).to.deep.eq(new Date(2024, 5, 13));
			expect(tasks.byId(8).end).to.deep.eq(new Date(2024, 5, 17));

			// update summary task type
			store.in.exec("update-task", {
				id: 8,
				task: {
					type: "task",
				},
			});
			store.in.exec("update-task", {
				id: 8,
				task: {
					type: "milestone",
				},
			});

			store.in.exec("undo");
			expect(tasks.byId(8).type).to.eq("task");
			expect(tasks.byId(8).duration).to.eq(4);
			expect(tasks.byId(8).start).to.deep.eq(new Date(2024, 5, 13));
			expect(tasks.byId(8).end).to.deep.eq(new Date(2024, 5, 17));

			store.in.exec("undo");
			expect(tasks.byId(8).type).to.eq("summary");
			expect(tasks.byId(8).duration).to.eq(4);
			expect(tasks.byId(8).start).to.deep.eq(new Date(2024, 5, 13));
			expect(tasks.byId(8).end).to.deep.eq(new Date(2024, 5, 17));

			store.in.exec("redo");
			expect(tasks.byId(8).type).to.eq("task");
			store.in.exec("redo");
			expect(tasks.byId(8).type).to.eq("milestone");
			expect(tasks.byId(8).duration).to.eq(0);
			expect(tasks.byId(8).start).to.deep.eq(new Date(2024, 5, 13));
			expect(tasks.byId(8).end).to.eq(undefined);
		});

		test("can undo/redo after updating task via dragging", () => {
			const initData = getData();
			resetState({
				...initData,
				undo: true,
			});

			const { tasks } = store.getState();

			store.in.exec("update-task", {
				id: 2,
				diff: 3,
				task: {
					start: new Date(2024, 3, 6),
					end: new Date(2024, 3, 8),
				},
			});

			store.in.exec("undo");
			expect(tasks.byId(2).duration).to.eq(2);
			expect(tasks.byId(2).start).to.deep.eq(new Date(2024, 3, 6));
			expect(tasks.byId(2).end).to.deep.eq(new Date(2024, 3, 8));

			store.in.exec("redo");
			expect(tasks.byId(2).duration).to.eq(2);
			expect(tasks.byId(2).start).to.deep.eq(new Date(2024, 3, 9));
			expect(tasks.byId(2).end).to.deep.eq(new Date(2024, 3, 11));

			store.in.exec("undo");
			expect(tasks.byId(2).duration).to.eq(2);
			expect(tasks.byId(2).start).to.deep.eq(new Date(2024, 3, 6));
			expect(tasks.byId(2).end).to.deep.eq(new Date(2024, 3, 8));
		});

		test("can undo/redo after updating task via dragging (summaries tasks)", () => {
			const initData = getData("summaries");
			resetState({
				...initData,
				undo: true,
			});

			const { tasks } = store.getState();

			store.in.exec("update-task", {
				id: 8,
				diff: 3,
				task: {
					start: new Date(2024, 5, 13),
					end: new Date(2024, 5, 21),
				},
			});

			store.in.exec("undo");
			expect(tasks.byId(8).start).to.deep.eq(new Date(2024, 5, 13));
			expect(tasks.byId(8).end).to.deep.eq(new Date(2024, 5, 21));
			expect(tasks.byId(4).start).to.deep.eq(new Date(2024, 5, 13));
			expect(tasks.byId(10).start).to.deep.eq(new Date(2024, 5, 14));

			store.in.exec("redo");
			expect(tasks.byId(8).start).to.deep.eq(new Date(2024, 5, 16));
			expect(tasks.byId(8).end).to.deep.eq(new Date(2024, 5, 24));
			expect(tasks.byId(4).start).to.deep.eq(new Date(2024, 5, 16));
			expect(tasks.byId(10).start).to.deep.eq(new Date(2024, 5, 17));

			store.in.exec("undo");
			expect(tasks.byId(8).start).to.deep.eq(new Date(2024, 5, 13));
			expect(tasks.byId(8).end).to.deep.eq(new Date(2024, 5, 21));
			expect(tasks.byId(4).start).to.deep.eq(new Date(2024, 5, 13));
			expect(tasks.byId(10).start).to.deep.eq(new Date(2024, 5, 14));
		});

		test("can undo/redo after updating task when some task fields are not provided initially", () => {
			const initData = getData();
			resetState({
				...initData,
				undo: true,
			});

			const { tasks } = store.getState();

			store.in.exec("update-task", {
				id: 1,
				task: {
					description: "some text",
					season: 3,
				},
			});

			store.in.exec("undo");
			expect(tasks.byId(1).description).to.be.undefined;
			expect(tasks.byId(1).season).to.be.undefined;
			expect("description" in tasks.byId(1)).to.eq(false);
			expect("season" in tasks.byId(1)).to.eq(false);

			store.in.exec("redo");
			expect(tasks.byId(1).description).to.eq("some text");
			expect(tasks.byId(1).season).to.eq(3);

			store.in.exec("undo");
			expect(tasks.byId(1).description).to.be.undefined;
			expect(tasks.byId(1).season).to.be.undefined;
		});

		test("undo keeps a field that had no value on either side", () => {
			const initData = getData();
			resetState({
				...initData,
				tasks: [
					{
						id: 1,
						text: "m",
						type: "milestone",
						parent: 0,
						start: new Date(2024, 3, 2),
					},
				],
				links: [],
				undo: true,
			});

			const { tasks } = store.getState();
			expect("end" in tasks.byId(1)).to.eq(true);

			store.in.exec("update-task", { id: 1, task: { text: "renamed" } });
			store.in.exec("undo");

			expect(tasks.byId(1).text).to.eq("m");
			expect("end" in tasks.byId(1)).to.eq(true);
		});

		test("redo removes a field the edit cleared", () => {
			const initData = getData();
			resetState({
				...initData,
				undo: true,
			});

			const { tasks } = store.getState();

			store.in.exec("update-task", { id: 1, task: { note: "x" } as any });
			store.in.exec("update-task", {
				id: 1,
				task: { note: undefined } as any,
			});
			expect("note" in tasks.byId(1)).to.eq(false);

			store.in.exec("undo");
			expect(tasks.byId(1).note).to.eq("x");

			store.in.exec("redo");
			expect("note" in tasks.byId(1)).to.eq(false);
		});

		test("can undo/redo after uscheduling tasks", () => {
			const initData = getData();
			resetState({
				...initData,
				unscheduledTasks: true,
				undo: true,
			});

			const { tasks } = store.getState();

			store.in.exec("update-task", {
				id: 1,
				task: {
					start: null,
				},
			});

			store.in.exec("undo");
			expect(tasks.byId(1).start).to.deep.eq(new Date(2024, 3, 2));
			expect(tasks.byId(1).duration).to.eq(3);

			store.in.exec("redo");
			expect(tasks.byId(1).start).to.eq(null);
			expect(tasks.byId(1).unscheduled).to.eq(true);

			store.in.exec("undo");
			expect(tasks.byId(1).start).to.deep.eq(new Date(2024, 3, 2));

			store.in.exec("redo");
			expect(tasks.byId(1).start).to.eq(null);
			expect(tasks.byId(1).unscheduled).to.eq(true);
		});

		test("can undo/redo after scheduling tasks", () => {
			const initData = getData();
			resetState({
				...initData,
				tasks: [
					{
						id: 1,
						text: "Task 1",
						type: "task",
						parent: 0,
						duration: 2,
					},
					{
						id: 2,
						text: "Task 2",
						type: "task",
						parent: 0,
						start: new Date(2024, 3, 6),
						end: new Date(2024, 3, 8),
					},
				],
				unscheduledTasks: true,
				undo: true,
			});

			const { tasks } = store.getState();

			store.in.exec("update-task", {
				id: 1,
				task: {
					start: new Date(2024, 3, 2),
				},
			});

			store.in.exec("undo");
			expect(tasks.byId(1).start).to.be.undefined;
			expect(tasks.byId(1).duration).to.eq(2);
			expect(tasks.byId(1).unscheduled).to.eq(true);

			store.in.exec("redo");
			expect(tasks.byId(1).start).to.deep.eq(new Date(2024, 3, 2));
			expect(tasks.byId(1).duration).to.eq(2);
			expect(tasks.byId(1).unscheduled).to.eq(false);

			store.in.exec("undo");
			expect(tasks.byId(1).start).to.be.undefined;
			expect(tasks.byId(1).duration).to.eq(2);
			expect(tasks.byId(1).unscheduled).to.eq(true);

			store.in.exec("redo");
			expect(tasks.byId(1).start).to.deep.eq(new Date(2024, 3, 2));
			expect(tasks.byId(1).duration).to.eq(2);
			expect(tasks.byId(1).unscheduled).to.eq(false);
		});
	});

	describe("add-task", () => {
		test("can undo/redo after adding task", () => {
			const initData = getData();
			resetState({
				...initData,
				undo: true,
			});

			const { tasks } = store.getState();

			store.in.exec("add-task", { task: { id: 7 } });
			store.in.exec("add-task", {
				task: {
					id: 8,
					text: "some text",
					type: "milestone",
					start: new Date(2024, 3, 10),
				},
			});

			expect(tasks.toArray().length).to.eq(4);

			store.in.exec("undo");
			expect(tasks.toArray().length).to.eq(3);
			expect(tasks.toArray().map(t => t.id)).to.deep.equal([1, 2, 7]);

			store.in.exec("undo");
			expect(tasks.toArray().map(t => t.id)).to.deep.equal([1, 2]);

			store.in.exec("redo");
			expect(tasks.toArray().map(t => t.id)).to.deep.equal([1, 2, 7]);

			store.in.exec("redo");
			expect(tasks.toArray().map(t => t.id)).to.deep.equal([1, 2, 7, 8]);
			expect(tasks.byId(8).type).to.eq("milestone");
			expect(tasks.byId(8).text).to.eq("some text");
		});

		test("can undo/redo after adding task (summaries tasks)", () => {
			const initData = getData("summaries");
			resetState({
				...initData,
				undo: true,
			});

			const { tasks } = store.getState();

			store.in.exec("add-task", {
				task: {
					id: 20,
					parent: 1,
					type: "task",
					start: new Date(2024, 5, 21),
					end: new Date(2024, 5, 23),
				},
			});
			store.in.exec("add-task", {
				task: {
					id: 22,
					parent: 8,
					type: "task",
					start: new Date(2024, 5, 24),
					end: new Date(2024, 5, 25),
				},
			});

			expect(tasks.byId(1).duration).to.eq(12);
			expect((tasks.byId(1).data as IParsedTask[]).length).to.eq(3);
			expect((tasks.byId(8).data as IParsedTask[]).length).to.eq(4);

			store.in.exec("undo");
			expect(tasks.byId(1).duration).to.eq(10);
			expect((tasks.byId(1).data as IParsedTask[]).length).to.eq(3);
			expect(tasks.byId(22)).to.eq(undefined);
			expect((tasks.byId(8).data as IParsedTask[]).length).to.eq(3);

			store.in.exec("undo");
			expect(tasks.byId(1).duration).to.eq(8);
			expect((tasks.byId(1).data as IParsedTask[]).length).to.eq(2);
			expect(tasks.byId(20)).to.eq(undefined);
			expect(tasks.byId(22)).to.eq(undefined);

			store.in.exec("redo");
			expect(tasks.byId(1).duration).to.eq(10);
			expect((tasks.byId(1).data as IParsedTask[]).length).to.eq(3);
			expect((tasks.byId(8).data as IParsedTask[]).length).to.eq(3);

			store.in.exec("redo");
			expect(tasks.byId(1).duration).to.eq(12);
			expect((tasks.byId(1).data as IParsedTask[]).length).to.eq(3);
			expect((tasks.byId(8).data as IParsedTask[]).length).to.eq(4);
		});

		test("can undo/redo after adding child task", () => {
			const initData = getData();
			resetState({
				...initData,
				undo: true,
			});

			const { tasks } = store.getState();

			store.in.exec("add-task", {
				target: 1,
				task: { id: 7 },
				mode: "child",
			});
			store.in.exec("add-task", {
				target: 7,
				task: { id: 8 },
				mode: "child",
			});

			store.in.exec("undo");
			expect(tasks.byId(1).data?.map(d => d.id)).to.deep.equal([7]);
			expect(!!tasks.byId(7).data).to.eq(false);

			store.in.exec("undo");
			expect(!!tasks.byId(1).data).to.eq(false);
			expect(tasks.byId(7)).to.eq(undefined);

			store.in.exec("redo");
			expect(tasks.byId(1).data?.map(d => d.id)).to.deep.equal([7]);
			expect(!!tasks.byId(7).data).to.eq(false);

			store.in.exec("redo");
			expect(tasks.byId(1).data?.map(d => d.id)).to.deep.equal([7]);
			expect(tasks.byId(7).data?.map(d => d.id)).to.deep.equal([8]);
		});

		test("can undo/redo after adding unscheduled task", () => {
			const initData = getData();
			resetState({
				...initData,
				unscheduledTasks: true,
				undo: true,
			});

			const { tasks } = store.getState();

			store.in.exec("add-task", {
				task: { id: 5, text: "New Task" },
			});

			expect(tasks.byId(5).unscheduled).to.eq(true);
			expect(tasks.byId(5).start).to.be.undefined;

			store.in.exec("undo");
			store.in.exec("redo");

			expect(tasks.byId(5).unscheduled).to.eq(true);
			expect(tasks.byId(5).start).to.be.undefined;
		});
	});

	describe("delete-task", () => {
		test("can undo/redo after deleting task", () => {
			const initData = getData();
			resetState({
				...initData,
				undo: true,
			});

			const { tasks } = store.getState();

			store.in.exec("delete-task", { id: 1 });
			store.in.exec("delete-task", { id: 2 });

			expect(tasks.toArray().length).to.eq(0);

			store.in.exec("undo");
			expect(tasks.toArray().map(t => t.id)).to.deep.equal([2]);

			store.in.exec("undo");
			expect(tasks.toArray().map(t => t.id)).to.deep.equal([1, 2]);

			store.in.exec("redo");
			expect(tasks.toArray().map(t => t.id)).to.deep.equal([2]);

			store.in.exec("redo");
			expect(tasks.toArray().map(t => t.id)).to.deep.equal([]);
		});

		test("can undo/redo after deliting task (summaries tasks)", () => {
			const initData = getData("summaries");
			resetState({
				...initData,
				undo: true,
			});

			const { tasks } = store.getState();

			store.in.exec("add-task", {
				task: {
					id: 20,
					parent: 1,
					type: "task",
					start: new Date(2024, 5, 21),
					end: new Date(2024, 5, 23),
				},
			});
			store.in.exec("add-task", {
				task: {
					id: 22,
					parent: 8,
					type: "task",
					start: new Date(2024, 5, 24),
					end: new Date(2024, 5, 25),
				},
			});

			expect(tasks.byId(1).duration).to.eq(12);
			expect((tasks.byId(1).data as IParsedTask[]).length).to.eq(3);
			expect((tasks.byId(8).data as IParsedTask[]).length).to.eq(4);

			store.in.exec("undo");
			expect(tasks.byId(1).duration).to.eq(10);
			expect((tasks.byId(1).data as IParsedTask[]).length).to.eq(3);
			expect(tasks.byId(22)).to.eq(undefined);
			expect((tasks.byId(8).data as IParsedTask[]).length).to.eq(3);

			store.in.exec("undo");
			expect(tasks.byId(1).duration).to.eq(8);
			expect((tasks.byId(1).data as IParsedTask[]).length).to.eq(2);
			expect(tasks.byId(20)).to.eq(undefined);
			expect(tasks.byId(22)).to.eq(undefined);

			store.in.exec("redo");
			expect(tasks.byId(1).duration).to.eq(10);
			expect((tasks.byId(1).data as IParsedTask[]).length).to.eq(3);
			expect((tasks.byId(8).data as IParsedTask[]).length).to.eq(3);

			store.in.exec("redo");
			expect(tasks.byId(1).duration).to.eq(12);
			expect((tasks.byId(1).data as IParsedTask[]).length).to.eq(3);
			expect((tasks.byId(8).data as IParsedTask[]).length).to.eq(4);
		});

		test("can undo/redo after deliting task with link", () => {
			const initData = getData();
			resetState({
				...initData,
				undo: true,
				links: [
					...initData.links,
					{
						id: 3,
						source: 1,
						target: 2,
						type: "e2s",
					},
				],
			});

			const { tasks, links } = store.getState();

			store.in.exec("delete-task", { id: 1 });

			expect(tasks.toArray().length).to.eq(1);
			expect(links.byId(3)).to.eq(undefined);

			store.in.exec("undo");
			expect(tasks.toArray().length).to.eq(2);
			expect(links.byId(3).source).to.eq(1);
			expect(links.byId(3).target).to.eq(2);

			store.in.exec("redo");
			expect(tasks.toArray().length).to.eq(1);
			expect(links.byId(3)).to.eq(undefined);

			store.in.exec("delete-task", { id: 2 });

			expect(tasks.toArray().length).to.eq(0);
			expect(links.byId(3)).to.eq(undefined);

			store.in.exec("undo");
			expect(tasks.toArray().length).to.eq(1);
			expect(links.byId(3)).to.eq(undefined);

			store.in.exec("undo");
			expect(tasks.toArray().length).to.eq(2);
			expect(!!links.byId(3)).to.eq(true);
		});

		test("can undo/redo after deliting task with children", () => {
			const initData = getData("full");
			resetState({
				...initData,
				undo: true,
			});

			const { tasks, links } = store.getState();

			store.in.exec("delete-task", { id: 11 });

			expect(tasks.toArray().length).to.eq(18);
			expect(links.map(link => link.id)).to.deep.equal([4, 5, 6, 7]);

			store.in.exec("undo");
			expect(tasks.toArray().length).to.eq(19);
			expect(tasks.byId(1)?.data?.length).to.eq(3);
			expect(tasks.byId(11)?.data?.length).to.eq(4);
			expect(links.map(link => link.id).sort()).to.deep.equal([
				1, 2, 3, 4, 5, 6, 7,
			]);
		});

		test("can undo/redo after deleting parent task with child assignments", () => {
			const initData = getData("full");
			const resources = [
				{ id: "r1", name: "Alex" },
				{ id: "r2", name: "Sophie" },
			];
			const assignments = [
				{ id: 1, task: 11, resource: "r1" },
				{ id: 2, task: 110, resource: "r1" },
				{ id: 3, task: 112, resource: "r2" },
			];
			resetState({
				...initData,
				resources,
				assignments,
				undo: true,
			});

			const { tasks } = store.getState();
			const beforeUndo = store.getState()._assignments!;

			store.in.exec("delete-task", { id: 11 });

			expect(tasks.byId(11)).to.eq(undefined);
			expect(tasks.byId(110)).to.eq(undefined);
			expect(tasks.byId(112)).to.eq(undefined);

			store.in.exec("undo");

			expect(tasks.byId(11)).toBeDefined();
			expect(tasks.byId(110)).toBeDefined();
			expect(tasks.byId(112)).toBeDefined();
			const afterUndo = store.getState()._assignments!;
			expect(afterUndo.byTask[11].map(a => a.id)).to.deep.equal(
				beforeUndo.byTask[11].map(a => a.id)
			);
			expect(afterUndo.byTask[110].map(a => a.id)).to.deep.equal(
				beforeUndo.byTask[110].map(a => a.id)
			);
			expect(afterUndo.byTask[112].map(a => a.id)).to.deep.equal(
				beforeUndo.byTask[112].map(a => a.id)
			);

			store.in.exec("redo");

			expect(tasks.byId(11)).to.eq(undefined);
			expect(tasks.byId(110)).to.eq(undefined);
			expect(tasks.byId(112)).to.eq(undefined);
		});

		test("can undo/redo after deliting childs", () => {
			const initData = getData("full");
			resetState({
				...initData,
				undo: true,
			});

			const { tasks } = store.getState();

			store.in.exec("open-task", { id: 11, mode: true });
			store.in.exec("delete-task", { id: 111 });
			store.in.exec("delete-task", { id: 12 });
			store.in.exec("delete-task", { id: 11 });

			expect(tasks.toArray().length).to.eq(17);
			expect(tasks.byId(1)?.data?.length).to.eq(1);

			store.in.exec("undo");
			expect(tasks.toArray().length).to.eq(21);
			expect(tasks.byId(1)?.data?.map(({ id }) => id)).to.deep.equal([
				10, 11,
			]);
			expect(tasks.byId(11)?.data?.map(({ id }) => id)).to.deep.equal([
				110, 112, 113,
			]);

			store.in.exec("undo");
			expect(tasks.toArray().length).to.eq(22);
			expect(tasks.byId(1)?.data?.map(({ id }) => id)).to.deep.equal([
				10, 11, 12,
			]);
			expect(tasks.byId(11)?.data?.map(({ id }) => id)).to.deep.equal([
				110, 112, 113,
			]);

			store.in.exec("undo");
			expect(tasks.toArray().length).to.eq(23);
			expect(tasks.byId(1)?.data?.map(({ id }) => id)).to.deep.equal([
				10, 11, 12,
			]);
			expect(tasks.byId(11)?.data?.map(({ id }) => id)).to.deep.equal([
				110, 111, 112, 113,
			]);

			store.in.exec("redo");
			store.in.exec("redo");
			expect(tasks.toArray().length).to.eq(21);
			expect(tasks.byId(1)?.data?.map(({ id }) => id)).to.deep.equal([
				10, 11,
			]);
			expect(tasks.byId(11)?.data?.map(({ id }) => id)).to.deep.equal([
				110, 112, 113,
			]);
		});

		test("can undo after deliting open/close task with children", () => {
			const initData = getData("full");
			resetState({
				...initData,
				undo: true,
			});

			const { tasks } = store.getState();

			store.in.exec("delete-task", { id: 1 });

			store.in.exec("undo");
			expect(tasks.byId(1).open).to.eq(true);
			expect(!!tasks.byId(11).open).to.eq(false);

			store.in.exec("open-task", { id: 11, mode: true });
			store.in.exec("delete-task", { id: 1 });

			store.in.exec("undo");
			expect(tasks.byId(1).open).to.eq(true);
			expect(tasks.byId(11).open).to.eq(true);

			store.in.exec("open-task", { id: 1, mode: false });
			expect(tasks.byId(1).open).to.eq(false);
			store.in.exec("delete-task", { id: 1 });

			store.in.exec("undo");
			expect(!!tasks.byId(1).open).to.eq(false);
		});
	});

	describe("copy-task", () => {
		test("can undo/redo after copy task", () => {
			const initData = getData();
			resetState({
				...initData,
				undo: true,
			});

			const { tasks } = store.getState();

			store.in.exec("copy-task", { id: 1, target: 2 });
			const copyId = tasks.toArray()?.at(-1)?.id as TID;

			store.in.exec("undo");
			expect(tasks.toArray().length).to.eq(2);
			expect(tasks.byId(copyId)).to.eq(undefined);

			store.in.exec("redo");
			expect(tasks.toArray().length).to.eq(3);
			expect(!!tasks.byId(copyId)).to.eq(true);
			expect(tasks.byId(copyId).text).to.eq("Task 1");
		});

		test("can undo/redo after copy task (summary tasks)", () => {
			const initData = getData("summaries");
			resetState({
				...initData,
				undo: true,
			});

			const { tasks } = store.getState();

			store.in.exec("copy-task", { id: 6, target: 12 });
			const copyIndex1 = 2;
			const copyId1 = tasks.byId(11).data?.at(copyIndex1)?.id as TID;
			expect(tasks.byId(11).duration).to.eq(6);

			store.in.exec("copy-task", { id: 2, target: 13 });
			const copyIndex2 = 4;
			const copyId2 = tasks.byId(11).data?.at(copyIndex2)?.id as TID;
			expect(tasks.byId(11).duration).to.eq(7);

			store.in.exec("undo");
			expect((tasks.byId(11).data as IParsedTask[]).length).to.eq(4);
			expect(tasks.byId(11).duration).to.eq(6);
			expect(tasks.byId(copyId2)).to.eq(undefined);
			expect(!!tasks.byId(copyId1)).to.eq(true);
			expect(tasks.byId(copyId1).parent).to.eq(11);
			expect(tasks.getIndexById(copyId1)).to.eq(copyIndex1);

			store.in.exec("undo");
			expect((tasks.byId(11).data as IParsedTask[]).length).to.eq(3);
			expect(tasks.byId(11).duration).to.eq(2);
			expect(tasks.byId(copyId2)).to.eq(undefined);
			expect(tasks.byId(copyId1)).to.eq(undefined);

			store.in.exec("redo");
			expect((tasks.byId(11).data as IParsedTask[]).length).to.eq(4);
			expect(tasks.byId(11).duration).to.eq(6);
			expect(tasks.byId(copyId2)).to.eq(undefined);
			expect(!!tasks.byId(copyId1)).to.eq(true);
			expect(tasks.byId(copyId1).parent).to.eq(11);
			expect(tasks.getIndexById(copyId1)).to.eq(copyIndex1);

			store.in.exec("redo");
			expect((tasks.byId(11).data as IParsedTask[]).length).to.eq(5);
			expect(tasks.byId(11).duration).to.eq(7);
			expect(tasks.byId(copyId1).parent).to.eq(11);
			expect(tasks.byId(copyId2).parent).to.eq(11);
			expect(tasks.getIndexById(copyId1)).to.eq(copyIndex1);
			expect(tasks.getIndexById(copyId2)).to.eq(copyIndex2);
		});

		test("can undo/redo after copy task with childs", () => {
			const initData = getData("full");
			resetState({
				...initData,
				undo: true,
			});

			const { tasks, links } = store.getState();

			store.in.exec("copy-task", { id: 11, target: 22 });
			const copyId = tasks.byId(2)?.data?.at(3)?.id as TID;
			expect(links.map(link => link).length).to.eq(8);

			store.in.exec("undo");
			expect((tasks.byId(2).data as IParsedTask[]).length).to.eq(4);
			expect(tasks.byId(copyId)).to.eq(undefined);
			expect(links.map(link => link).length).to.eq(7);

			store.in.exec("redo");
			expect((tasks.byId(2).data as IParsedTask[]).length).to.eq(5);
			expect(!!tasks.byId(copyId)).to.eq(true);
			expect(tasks.byId(copyId).parent).to.eq(2);
			expect(tasks.byId(copyId).data?.length).to.eq(4);
			expect(links.map(link => link).length).to.eq(8);
		});
	});

	describe("move-task", () => {
		test("can undo/redo after moving tasks", () => {
			const initData = getData("full");
			resetState({
				...initData,
				undo: true,
			});

			const { tasks } = store.getState();

			store.in.exec("move-task", { id: 20, target: 23, mode: "after" });
			store.in.exec("move-task", { id: 2, target: 4, mode: "before" });
			store.in.exec("move-task", { id: 40, target: 1, mode: "before" });

			store.in.exec("undo");
			expect(tasks.getBranch(1)?.map(t => t.id)).to.deep.equal([
				1, 3, 2, 4, 5,
			]);
			expect(tasks.getBranch(20)?.map(t => t.id)).to.deep.equal([
				21, 22, 23, 20,
			]);

			store.in.exec("undo");
			expect(tasks.getBranch(1)?.map(t => t.id)).to.deep.equal([
				1, 2, 3, 4, 5,
			]);
			expect(tasks.getBranch(20)?.map(t => t.id)).to.deep.equal([
				21, 22, 23, 20,
			]);

			store.in.exec("undo");
			expect(tasks.getBranch(1)?.map(t => t.id)).to.deep.equal([
				1, 2, 3, 4, 5,
			]);
			expect(tasks.getBranch(20)?.map(t => t.id)).to.deep.equal([
				20, 21, 22, 23,
			]);

			store.in.exec("redo");
			expect(tasks.getBranch(1)?.map(t => t.id)).to.deep.equal([
				1, 2, 3, 4, 5,
			]);
			expect(tasks.getBranch(20)?.map(t => t.id)).to.deep.equal([
				21, 22, 23, 20,
			]);

			store.in.exec("redo");
			expect(tasks.getBranch(1)?.map(t => t.id)).to.deep.equal([
				1, 3, 2, 4, 5,
			]);
			expect(tasks.getBranch(20)?.map(t => t.id)).to.deep.equal([
				21, 22, 23, 20,
			]);

			store.in.exec("redo");
			expect(tasks.getBranch(1)?.map(t => t.id)).to.deep.equal([
				40, 1, 3, 2, 4, 5,
			]);
			expect(tasks.getBranch(41)?.map(t => t.id)).to.deep.equal([
				41, 42, 43,
			]);
			expect(tasks.getBranch(20)?.map(t => t.id)).to.deep.equal([
				21, 22, 23, 20,
			]);
		});

		test("can undo moving the only child out of its branch", () => {
			resetState({
				...getData(),
				tasks: [
					{ id: 20, text: "New Task", type: "task" },
					{
						id: 47,
						text: "Master project",
						parent: 0,
						type: "summary",
					},
					{ id: 22, text: "Task", parent: 47, type: "task" },
					{ id: 21, text: "New Task 2", type: "task" },
				],
				links: [{ id: 1, source: 20, target: 21, type: "e2e" }],
				undo: true,
			});

			const { tasks } = store.getState();
			expect(tasks.byId(22).parent).to.eq(47);

			store.in.exec("move-task", { id: 22, target: 47, mode: "before" });
			expect(tasks.byId(22).parent).to.eq(0);

			store.in.exec("undo");
			expect(tasks.byId(22).parent).to.eq(47);
			expect(tasks.getBranch(22)?.map(t => t.id)).to.deep.equal([22]);

			store.in.exec("redo");
			expect(tasks.byId(22).parent).to.eq(0);
		});

		test("can undo/redo after moving tasks (summary tasks)", () => {
			const initData = getData("summaries");
			resetState({
				...initData,
				undo: true,
			});

			const { tasks } = store.getState();

			// target summary tasks before moving
			expect(tasks.byId(1).duration).to.eq(8);
			expect(tasks.byId(8).duration).to.eq(8);
			expect(tasks.byId(11).duration).to.eq(2);
			expect(tasks.byId(14).duration).to.eq(13);

			store.in.exec("move-task", { id: 6, target: 13, mode: "after" });
			store.in.exec("move-task", { id: 151, target: 8, mode: "child" });

			// summary tasks duration after moving
			expect(tasks.byId(1).duration).to.eq(13);
			expect(tasks.byId(8).duration).to.eq(13);
			expect(tasks.byId(11).duration).to.eq(6);
			expect(tasks.byId(14).duration).to.eq(7);

			store.in.exec("undo");
			expect(tasks.byId(11).data?.map(d => d.id)).to.deep.equal([
				5, 12, 13, 6,
			]);
			expect(tasks.byId(10).data?.map(t => t.id)).to.deep.equal([2]);
			expect(tasks.byId(15).data?.map(t => t.id)).to.deep.equal([
				151, 152,
			]);
			// summary tasks duration check
			expect(tasks.byId(11).duration).to.eq(6);
			expect(tasks.byId(14).duration).to.eq(13);

			store.in.exec("undo");
			expect(tasks.byId(10).data?.map(t => t.id)).to.deep.equal([2, 6]);
			expect(tasks.byId(15).data?.map(t => t.id)).to.deep.equal([
				151, 152,
			]);
			expect(tasks.byId(11).data?.map(d => d.id)).to.deep.equal([
				5, 12, 13,
			]);
			// summary tasks duration check
			expect(tasks.byId(1).duration).to.eq(8);
			expect(tasks.byId(8).duration).to.eq(8);
			expect(tasks.byId(11).duration).to.eq(2);
			expect(tasks.byId(14).duration).to.eq(13);

			store.in.exec("redo");
			expect(tasks.getBranch(6)?.map(t => t.id)).to.deep.equal([
				5, 12, 13, 6,
			]);
			expect(tasks.byId(10).data?.map(t => t.id)).to.deep.equal([2]);
			expect(tasks.byId(15).data?.map(t => t.id)).to.deep.equal([
				151, 152,
			]);
			// summary tasks duration check
			expect(tasks.byId(11).duration).to.eq(6);
			expect(tasks.byId(14).duration).to.eq(13);

			store.in.exec("redo");
			expect(tasks.getBranch(6)?.map(t => t.id)).to.deep.equal([
				5, 12, 13, 6,
			]);
			expect(tasks.byId(8).data?.map(t => t.id)).to.deep.equal([
				4, 10, 11, 151,
			]);
			expect(tasks.byId(10).data?.map(t => t.id)).to.deep.equal([2]);
			expect(tasks.byId(15).data?.map(t => t.id)).to.deep.equal([152]);
			// summary tasks duration check
			expect(tasks.byId(1).duration).to.eq(13);
			expect(tasks.byId(8).duration).to.eq(13);
			expect(tasks.byId(11).duration).to.eq(6);
			expect(tasks.byId(14).duration).to.eq(7);
		});

		test("can undo/redo after moving tasks with children", () => {
			const initData = getData("full");
			resetState({
				...initData,
				undo: true,
			});

			const { tasks } = store.getState();

			store.in.exec("move-task", { id: 11, target: 2, mode: "child" });

			store.in.exec("undo");
			expect(tasks.getBranch(11)?.map(t => t.id)).to.deep.equal([
				10, 11, 12,
			]);
			expect(tasks.byId(2)?.data?.length).to.eq(4);
			expect(tasks.byId(11)?.data?.length).to.eq(4);

			store.in.exec("redo");
			expect(tasks.getBranch(10)?.map(t => t.id)).to.deep.equal([10, 12]);
			expect(tasks.getBranch(11)?.map(t => t.id)).to.deep.equal([
				20, 21, 22, 23, 11,
			]);
			expect(tasks.byId(11)?.data?.length).to.eq(4);
		});

		test("does not record history for a task that is already deleted", async () => {
			const initData = getData("full");
			resetState({
				...initData,
				undo: true,
			});

			store.in.exec("delete-task", { id: 110 });

			let err: any = null;
			await store.in
				.exec("move-task", { id: 110, mode: "after", target: 112 })
				.catch((e: any) => (err = e));

			// the snapshot bails instead of dereferencing the deleted task
			expect(err?.stack).not.to.contain("HistoryManager");
			expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });
		});
	});

	describe("update-link", () => {
		test("can undo/redo after updating task", () => {
			const initData = getData("full");
			resetState({
				...initData,
				undo: true,
			});

			const { links } = store.getState();

			store.in.exec("update-link", { id: 1, link: { type: "s2s" } });
			store.in.exec("update-link", { id: 1, link: { target: 6 } });
			store.in.exec("update-link", {
				id: 6,
				link: { source: 20, type: "s2e" },
			});

			store.in.exec("undo");
			expect(links.byId(6).source).to.eq(22);
			expect(links.byId(6).type).to.eq("e2s");
			expect(links.byId(1).target).to.eq(6);
			expect(links.byId(1).type).to.eq("s2s");

			store.in.exec("undo");
			expect(links.byId(6).source).to.eq(22);
			expect(links.byId(1).target).to.eq(11);
			expect(links.byId(1).type).to.eq("s2s");

			store.in.exec("undo");
			expect(links.byId(6).source).to.eq(22);
			expect(links.byId(1).target).to.eq(11);
			expect(links.byId(1).type).to.eq("e2s");

			store.in.exec("redo");
			store.in.exec("redo");
			expect(links.byId(6).source).to.eq(22);
			expect(links.byId(1).target).to.eq(6);
			expect(links.byId(1).type).to.eq("s2s");

			store.in.exec("redo");
			expect(links.byId(6).source).to.eq(20);
			expect(links.byId(6).type).to.eq("s2e");
			expect(links.byId(1).target).to.eq(6);
			expect(links.byId(1).type).to.eq("s2s");
		});

		test("undo restores a lag the link was loaded without", () => {
			const initData = getData("full");
			resetState({
				...initData,
				undo: true,
			});

			const { links } = store.getState();

			store.in.exec("update-link", { id: 1, link: { lag: 5 } });
			expect(links.byId(1).lag).to.eq(5);

			store.in.exec("undo");
			expect(links.byId(1).lag).to.eq(0);

			store.in.exec("redo");
			expect(links.byId(1).lag).to.eq(5);
		});

		test("undo restores a field the edit changed", () => {
			const initData = getData("full");
			resetState({
				...initData,
				undo: true,
			});

			const { links } = store.getState();

			store.in.exec("update-link", { id: 1, link: { lag: 3 } });
			store.in.exec("update-link", { id: 1, link: { lag: 5 } });

			store.in.exec("undo");
			expect(links.byId(1).lag).to.eq(3);

			store.in.exec("redo");
			expect(links.byId(1).lag).to.eq(5);
		});

		test("undo restores a lag the edit cleared", () => {
			const initData = getData("full");
			resetState({
				...initData,
				undo: true,
			});

			const { links } = store.getState();

			store.in.exec("update-link", { id: 1, link: { lag: 3 } });
			store.in.exec("update-link", { id: 1, link: { lag: null } });
			expect(links.byId(1).lag).to.eq(0);

			store.in.exec("undo");
			expect(links.byId(1).lag).to.eq(3);

			store.in.exec("redo");
			expect(links.byId(1).lag).to.eq(0);
		});

		test("undo removes a field the edit added", () => {
			const initData = getData("full");
			resetState({
				...initData,
				undo: true,
			});

			const { links } = store.getState();

			store.in.exec("update-link", {
				id: 1,
				link: { comment: "check" } as Partial<ILink>,
			});
			expect((links.byId(1) as any).comment).to.eq("check");

			store.in.exec("undo");
			expect("comment" in links.byId(1)).to.eq(false);

			store.in.exec("redo");
			expect((links.byId(1) as any).comment).to.eq("check");
		});
	});

	describe("update-assignment", () => {
		test("undo removes an assignment field the edit added", () => {
			const initData = getData();
			resetState({
				...initData,
				resources: [{ id: "r1", name: "Alex" }],
				assignments: [{ id: 1, task: 1, resource: "r1" }],
				undo: true,
			});

			const { assignments } = store.getState();

			store.in.exec("update-assignment", {
				id: 1,
				assignment: { note: "urgent" } as Partial<IAssignment>,
			});
			expect((assignments.byId(1) as any).note).to.eq("urgent");

			store.in.exec("undo");
			expect("note" in assignments.byId(1)).to.eq(false);

			store.in.exec("redo");
			expect((assignments.byId(1) as any).note).to.eq("urgent");

			store.in.exec("update-assignment", {
				id: 1,
				assignment: { note: undefined } as Partial<IAssignment>,
			});
			expect("note" in assignments.byId(1)).to.eq(false);

			store.in.exec("undo");
			expect((assignments.byId(1) as any).note).to.eq("urgent");

			store.in.exec("redo");
			expect("note" in assignments.byId(1)).to.eq(false);
		});
	});

	describe("delete-link", () => {
		test("can undo/redo after deleting links", () => {
			const initData = getData("full");
			resetState({
				...initData,
				undo: true,
			});

			const { links } = store.getState();

			store.in.exec("delete-link", { id: 1 });
			store.in.exec("delete-link", { id: 5 });

			store.in.exec("undo");
			expect(links.map(l => l).length).to.eq(6);
			expect(links.byId(1)).to.eq(undefined);

			store.in.exec("undo");
			expect(links.map(l => l).length).to.eq(7);

			store.in.exec("redo");
			expect(links.map(l => l).length).to.eq(6);
			expect(links.byId(1)).to.eq(undefined);
			expect(!!links.byId(5)).to.eq(true);

			store.in.exec("redo");
			expect(links.map(l => l).length).to.eq(5);
			expect(links.byId(1)).to.eq(undefined);
			expect(links.byId(5)).to.eq(undefined);
		});
	});

	describe("add-link", () => {
		test("can undo/redo after adding links", () => {
			const initData = getData("full");
			resetState({
				...initData,
				undo: true,
			});

			const { links } = store.getState();

			store.in.exec("add-link", {
				link: {
					id: 10,
					source: 1,
					target: 7,
					type: "e2s",
				},
			});
			store.in.exec("add-link", {
				link: {
					id: 11,
					source: 3,
					target: 9,
					type: "s2e",
				},
			});

			store.in.exec("undo");
			expect(links.map(l => l).length).to.eq(8);
			expect(links.byId(11)).to.eq(undefined);
			expect(links.byId(10).target).to.eq(7);

			store.in.exec("undo");
			expect(links.map(l => l).length).to.eq(7);
			expect(links.byId(11)).to.eq(undefined);
			expect(links.byId(10)).to.eq(undefined);

			store.in.exec("redo");
			expect(links.map(l => l).length).to.eq(8);
			expect(links.byId(11)).to.eq(undefined);
			expect(links.byId(10).source).to.eq(1);

			store.in.exec("redo");
			expect(links.map(l => l).length).to.eq(9);
			expect(links.byId(10).type).to.eq("e2s");
			expect(links.byId(11).type).to.eq("s2e");
		});
	});

	describe("auto-scheduled summaries", () => {
		const day = (d: number) => new Date(2026, 3, d);

		function summaryProject() {
			const tasks: any[] = [
				{ id: 100, text: "S", type: "summary", parent: 0, open: true },
			];
			for (let i = 1; i <= 5; i++)
				tasks.push({
					id: i,
					text: `T${i}`,
					type: "task",
					parent: 100,
					start: day(6 + i * 2),
					end: day(8 + i * 2),
				});

			resetState({
				...getData("autoScheduling"),
				tasks,
				links: [
					{ id: 1, source: 1, target: 2, type: "e2s" },
					{ id: 2, source: 2, target: 3, type: "e2s" },
					{ id: 3, source: 4, target: 5, type: "e2s" },
				],
				undo: true,
				schedule: { auto: true },
			});
			vi.advanceTimersByTime(1);
		}

		function spans() {
			return store
				.getState()
				.tasks.toArray()
				.map(
					(t: IParsedTask) =>
						`${t.id}:${t.start?.valueOf()}..${t.end?.valueOf()}`
				)
				.join(" ");
		}

		beforeEach(() => {
			vi.useFakeTimers({ shouldAdvanceTime: true });
		});
		afterEach(() => {
			vi.useRealTimers();
		});

		test("undo after add-link restores members the edit never touched", () => {
			summaryProject();
			const before = spans();

			store.in.exec("add-link", {
				link: { source: 5, target: 1, type: "e2s" },
			});
			vi.advanceTimersByTime(1);
			const after = spans();
			expect(after).to.not.eq(before);

			store.in.exec("undo");
			vi.advanceTimersByTime(1);
			expect(spans()).to.eq(before);

			store.in.exec("redo");
			vi.advanceTimersByTime(1);
			expect(spans()).to.eq(after);
		});

		test("undo after dragging a member restores the other members", () => {
			summaryProject();
			const before = spans();

			store.in.exec("update-task", {
				id: 1,
				task: { start: day(20), end: day(22) },
			});
			vi.advanceTimersByTime(1);
			const after = spans();
			expect(after).to.not.eq(before);

			store.in.exec("undo");
			vi.advanceTimersByTime(1);
			expect(spans()).to.eq(before);

			store.in.exec("redo");
			vi.advanceTimersByTime(1);
			expect(spans()).to.eq(after);
		});

		test("repeated undo/redo does not drift", () => {
			summaryProject();
			const before = spans();

			store.in.exec("add-link", {
				link: { source: 5, target: 1, type: "e2s" },
			});
			vi.advanceTimersByTime(1);
			const after = spans();

			for (let i = 0; i < 3; i++) {
				store.in.exec("undo");
				vi.advanceTimersByTime(1);
				expect(spans()).to.eq(before);

				store.in.exec("redo");
				vi.advanceTimersByTime(1);
				expect(spans()).to.eq(after);
			}
		});
	});

	describe("combination of actions", () => {
		test("can undo/redo after combination of task actions", () => {
			const initData = getData();
			resetState({
				...initData,
				undo: true,
			});

			const { tasks } = store.getState();

			store.in.exec("update-task", {
				id: 1,
				task: { text: "some text" },
			});
			store.in.exec("move-task", { id: 1, target: 2, mode: "after" });
			store.in.exec("delete-task", { id: 1 });

			store.in.exec("undo");
			expect(tasks.toArray().map(t => t.id)).to.deep.equal([2, 1]);
			expect(tasks.byId(1).text).to.eq("some text");

			store.in.exec("undo");
			expect(tasks.toArray().map(t => t.id)).to.deep.equal([1, 2]);
			expect(tasks.byId(1).text).to.eq("some text");

			store.in.exec("undo");
			expect(tasks.byId(1).text).to.eq("Task 1");

			store.in.exec("redo");
			expect(tasks.toArray().map(t => t.id)).to.deep.equal([1, 2]);
			expect(tasks.byId(1).text).to.eq("some text");

			store.in.exec("redo");
			expect(tasks.toArray().map(t => t.id)).to.deep.equal([2, 1]);
			expect(tasks.byId(1).text).to.eq("some text");

			store.in.exec("redo");
			expect(tasks.toArray().map(t => t.id)).to.deep.equal([2]);
		});

		test("can undo/redo after combination of task and links actions", () => {
			const initData = getData("full");
			resetState({
				...initData,
				undo: true,
			});

			const { tasks, links } = store.getState();

			store.in.exec("delete-task", { id: 11 });
			store.in.exec("update-task", {
				id: 10,
				task: { text: "some text" },
			});
			store.in.exec("update-link", { id: 4, link: { type: "s2s" } });
			store.in.exec("move-task", { id: 20, target: 23, mode: "before" });

			store.in.exec("undo");
			expect(tasks.byId(2).data?.map(d => d.id)).to.deep.equal([
				20, 21, 22, 23,
			]);
			expect(links.byId(4).type).to.eq("s2s");

			store.in.exec("undo");
			expect(links.byId(4).type).to.eq("e2s");
			expect(tasks.byId(10).text).to.eq("some text");
			expect(tasks.byId(1).data?.map(d => d.id)).to.deep.equal([10, 12]);

			store.in.exec("undo");
			expect(tasks.byId(10).text).to.eq("Marketing analysis");
			expect(links.map(l => l).length).to.eq(4);

			store.in.exec("undo");
			expect(tasks.byId(1).data?.map(d => d.id)).to.deep.equal([
				10, 11, 12,
			]);
			expect(tasks.byId(11).data?.length).to.eq(4);
			expect(links.map(l => l).length).to.eq(7);

			for (let i = 0; i < 4; i++) store.in.exec("redo");
			expect(tasks.byId(1).data?.map(d => d.id)).to.deep.equal([10, 12]);
			expect(tasks.byId(2).data?.map(d => d.id)).to.deep.equal([
				21, 22, 20, 23,
			]);
			expect(tasks.byId(10).text).to.eq("some text");
			expect(links.map(l => l).length).to.eq(4);
			expect(links.byId(4).type).to.eq("s2s");

			store.in.exec("add-task", { task: { id: 8, text: "Task 8" } });
			const link = {
				id: 15,
				source: 4,
				target: 8,
				type: "e2s",
			};
			store.in.exec("add-link", { link });
			store.in.exec("update-link", { id: 15, link: { type: "s2s" } });

			store.in.exec("undo");
			expect(tasks.getBranch(1)?.length).to.eq(6);
			expect(links.byId(15)).to.deep.equal(link);
			expect(links.map(l => l).length).to.eq(5);

			store.in.exec("undo");
			store.in.exec("undo");
			expect(tasks.getBranch(1)?.length).to.eq(5);
			expect(links.map(l => l).length).to.eq(4);

			for (let i = 0; i < 4; i++) store.in.exec("redo");
			expect(tasks.getBranch(1)?.length).to.eq(6);
			expect(links.map(l => l).length).to.eq(5);
			expect(links.byId(15)).to.deep.equal({ ...link, type: "s2s" });
		});

		test("can undo/redo after combination of actions (summary tasks)", () => {
			const initData = getData("summaries");
			resetState({
				...initData,
				undo: true,
			});

			const { tasks, links } = store.getState();

			store.in.exec("delete-task", { id: 11 });
			expect(tasks.byId(1).data?.map(d => d.id)).to.deep.equal([7, 8]); //7,8,11
			expect(tasks.byId(1).duration).to.deep.equal(6); //
			expect(links.map(l => l).length).to.eq(6);

			store.in.exec("move-task", { id: 3, target: 6, mode: "after" });
			expect(tasks.byId(10).data?.map(d => d.id)).to.deep.equal([
				2, 6, 3,
			]); //2,6
			expect(tasks.byId(7).data?.map(d => d.id)).to.deep.equal([9]);
			expect(tasks.byId(7).duration).to.deep.equal(1); // 2

			store.in.exec("delete-link", { id: 2 });
			expect(links.map(l => l).length).to.eq(5);

			store.in.exec("undo");
			expect(tasks.byId(10).data?.map(d => d.id)).to.deep.equal([
				2, 6, 3,
			]); //2,6
			expect(tasks.byId(7).data?.map(d => d.id)).to.deep.equal([9]);
			expect(tasks.byId(7).duration).to.deep.equal(1);
			expect(links.map(l => l).length).to.eq(6);

			store.in.exec("undo");
			expect(tasks.byId(10).data?.map(d => d.id)).to.deep.equal([2, 6]);
			expect(tasks.byId(7).data?.map(d => d.id)).to.deep.equal([3, 9]);
			expect(tasks.byId(1).data?.map(d => d.id)).to.deep.equal([7, 8]);
			expect(tasks.byId(7).duration).to.deep.equal(2);
			expect(tasks.byId(8).duration).to.deep.equal(6);

			store.in.exec("undo");
			expect(tasks.byId(8).data?.map(d => d.id)).to.deep.equal([
				4, 10, 11,
			]);
			expect(tasks.byId(8).duration).to.deep.equal(8);
			expect(links.map(l => l).length).to.eq(7);

			for (let i = 0; i < 3; i++) store.in.exec("redo");
			expect(tasks.byId(7).duration).to.deep.equal(1);
			expect(tasks.byId(8).duration).to.deep.equal(6);
			expect(links.map(l => l).length).to.eq(5);
		});
	});

	describe("can handle batches", () => {
		const day = (n: number) => new Date(2024, 3, n);

		function linkedTasks() {
			return {
				...getData(),
				tasks: [
					{
						id: 1,
						text: "A",
						type: "task",
						parent: 0,
						start: day(2),
						end: day(4),
						duration: 2,
					},
					{
						id: 2,
						text: "B",
						type: "task",
						parent: 0,
						start: day(4),
						end: day(6),
						duration: 2,
					},
				],
				links: [{ id: 1, source: 1, target: 2, type: "e2s" }],
				schedule: { auto: true },
				undo: true,
			};
		}

		test("one undo restores an edited task and the tasks it moved", () => {
			resetState(linkedTasks());

			const { tasks } = store.getState();

			store.in.exec("update-task", {
				id: 1,
				task: { start: day(10), end: day(12), duration: 2 },
			});

			expect(tasks.byId(1).start).to.deep.eq(day(10));
			expect(tasks.byId(2).start).to.deep.eq(day(12));
			expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });

			store.in.exec("undo");

			expect(tasks.byId(1).start).to.deep.eq(day(2));
			expect(tasks.byId(2).start).to.deep.eq(day(4));
			expect(store.getState().history).to.deep.eq({ undo: 0, redo: 1 });

			store.in.exec("redo");

			expect(tasks.byId(1).start).to.deep.eq(day(10));
			expect(tasks.byId(2).start).to.deep.eq(day(12));
		});

		test("undo restores split-task segments after an autoschedule cascade", () => {
			const data = linkedTasks();
			data.tasks = data.tasks.map(t => {
				if (t.id === 2)
					return {
						...t,
						start: day(4),
						end: day(10),
						duration: 4,
						segments: [
							{
								start: day(4),
								end: day(6),
								duration: 2,
							},
							{
								start: day(8),
								end: day(10),
								duration: 2,
							},
						],
					};
				return t;
			});
			resetState({ ...data, splitTasks: true });

			const collectTestFields = ({
				start,
				end,
				duration,
				segments = [],
			}: IParsedTask) => {
				return {
					start,
					end,
					duration,
					segments: segments.map(({ start, end, duration }) => ({
						start,
						end,
						duration,
					})),
				};
			};

			const { tasks } = store.getState();
			const originalB = collectTestFields(tasks.byId(2));

			store.in.exec("update-task", {
				id: 1,
				task: { start: day(6), duration: 2 },
			});

			const changedB = collectTestFields(tasks.byId(2));

			store.in.exec("undo");

			let restoredB = collectTestFields(tasks.byId(2));
			expect(restoredB).to.deep.eq(originalB);

			store.in.exec("redo");

			restoredB = collectTestFields(tasks.byId(2));
			expect(restoredB).to.deep.eq(changedB);
		});

		test("one undo restores a link and the tasks it moved", () => {
			resetState({
				...linkedTasks(),
				tasks: [
					{
						id: 1,
						text: "A",
						type: "task",
						parent: 0,
						start: day(10),
						end: day(12),
						duration: 2,
					},
					{
						id: 2,
						text: "B",
						type: "task",
						parent: 0,
						start: day(2),
						end: day(4),
						duration: 2,
					},
				],
				links: [],
			});

			const { tasks } = store.getState();

			store.in.exec("add-link", {
				link: { id: 1, source: 1, target: 2, type: "e2s" },
			});

			expect(tasks.byId(2).start).to.deep.eq(day(12));
			expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });

			store.in.exec("undo");

			expect(tasks.byId(2).start).to.deep.eq(day(2));
			expect(store.getState().links.map((l: any) => l.id)).to.deep.eq([]);
			expect(store.getState().history).to.deep.eq({ undo: 0, redo: 1 });
		});

		test("a reparent and its scheduling cascade are one undo entry", () => {
			resetState({
				...getData(),
				tasks: [
					{
						id: 10,
						text: "S",
						type: "summary",
						parent: 0,
						open: true,
					},
					{
						id: 1,
						text: "A",
						type: "task",
						parent: 10,
						start: day(2),
						end: day(4),
						duration: 2,
					},
					{
						id: 2,
						text: "B",
						type: "task",
						parent: 0,
						start: day(4),
						end: day(8),
						duration: 4,
					},
					{
						id: 3,
						text: "C",
						type: "task",
						parent: 0,
						start: day(4),
						end: day(6),
						duration: 2,
					},
				],
				links: [{ id: 1, source: 10, target: 3, type: "e2s" }],
				schedule: { auto: true },
				summary: true,
				undo: true,
			});

			const { tasks } = store.getState();

			// moving B into the summary extends it, so C has to move too
			store.in.exec("move-task", { id: 2, target: 10, mode: "child" });

			expect(tasks.byId(2).parent).to.eq(10);
			expect(tasks.byId(3).start).to.deep.eq(day(8));
			expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });

			store.in.exec("undo");

			expect(tasks.byId(2).parent).to.eq(0);
			expect(tasks.byId(3).start).to.deep.eq(day(4));
		});

		test("cascades inside an explicit batch do not split it", () => {
			resetState(linkedTasks());

			const { tasks } = store.getState();
			const hm = store.getHistory();

			// two edits, each with a cascade, all of it one undo step
			hm.startBatch();
			store.in.exec("update-task", {
				id: 1,
				task: { start: day(10), end: day(12), duration: 2 },
			});
			store.in.exec("update-task", {
				id: 1,
				task: { start: day(15), end: day(17), duration: 2 },
			});
			hm.endBatch();

			expect(hm.isBatching()).to.eq(false);
			expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });

			store.in.exec("undo");

			expect(tasks.byId(1).start).to.deep.eq(day(2));
			expect(tasks.byId(2).start).to.deep.eq(day(4));
			expect(store.getState().history).to.deep.eq({ undo: 0, redo: 1 });
		});

		test("a direct schedule-tasks call is a step of its own", () => {
			resetState(linkedTasks());

			const { tasks } = store.getState();

			store.in.exec("update-task", {
				id: 1,
				task: { start: day(10), end: day(12), duration: 2 },
			});
			expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });

			// put task 2 back out of shape without touching history or scheduling
			store.in.exec("update-task", {
				id: 2,
				task: { start: day(2), end: day(4), duration: 2 },
				eventSource: "update-task",
				skipUndo: true,
			});
			store.in.exec("schedule-tasks", { id: 0 });

			expect(tasks.byId(2).start).to.deep.eq(day(12));
			expect(store.getState().history).to.deep.eq({ undo: 2, redo: 0 });

			store.in.exec("undo");

			expect(tasks.byId(2).start).to.deep.eq(day(2));
			expect(tasks.byId(1).start).to.deep.eq(day(10));
		});

		test("eventSource does not decide undo step boundaries", () => {
			resetState({ ...getData(), undo: true });

			const tasks = () => store.getState().tasks;

			store.in.exec("update-task", { id: 1, task: { text: "one" } });
			expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });

			// eventSource is public metadata, whatever it holds, so it must
			// not decide where one undo step ends and the next begins
			store.in.exec("update-task", {
				id: 2,
				task: { text: "two" },
				eventSource: "update-task",
			});
			expect(store.getState().history).to.deep.eq({ undo: 2, redo: 0 });

			store.in.exec("undo");

			expect(tasks().byId(2).text).to.eq("Task 2");
			expect(tasks().byId(1).text).to.eq("one");
		});

		test("a split after an edit is a step of its own", () => {
			const data = getData("pretty");
			resetState({ ...data, splitTasks: true, undo: true });

			const { tasks } = store.getState();
			const text = tasks.byId(20).text;

			store.in.exec("update-task", { id: 20, task: { text: "renamed" } });
			expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });

			store.in.exec("split-task", { id: 20 });
			expect(tasks.byId(20).segments.length).to.eq(2);
			expect(store.getState().history).to.deep.eq({ undo: 2, redo: 0 });

			// only the split comes back, the rename stays
			store.in.exec("undo");
			expect(!!tasks.byId(20).segments).to.eq(false);
			expect(tasks.byId(20).text).to.eq("renamed");

			store.in.exec("undo");
			expect(tasks.byId(20).text).to.eq(text);
		});

		test("a derived summary update stays in the same step", () => {
			resetState({
				...getData(),
				tasks: [
					{
						id: 10,
						text: "S",
						type: "summary",
						parent: 0,
						open: true,
					},
					{
						id: 1,
						text: "A",
						type: "task",
						parent: 10,
						start: day(2),
						end: day(4),
						duration: 2,
						progress: 0,
					},
				],
				links: [],
				summary: { autoProgress: true },
				undo: true,
			});

			const { tasks } = store.getState();

			store.in.exec("update-task", { id: 1, task: { progress: 70 } });

			expect(tasks.byId(10).progress).to.eq(70);
			expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });

			store.in.exec("undo");

			expect(tasks.byId(1).progress).to.eq(0);
			expect(tasks.byId(10).progress).to.eq(0);
			expect(store.getState().history).to.deep.eq({ undo: 0, redo: 1 });

			store.in.exec("redo");

			expect(tasks.byId(1).progress).to.eq(70);
			expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });
		});

		test("a reorder drag and its summary updates are one undo entry", () => {
			resetState({
				...getData("summaries"),
				undo: true,
			});

			const { tasks } = store.getState();
			const ids = [1, 7, 8, 11];
			const parent = tasks.byId(4).parent;
			const start = ids.map(id => tasks.byId(id).start);
			const end = ids.map(id => tasks.byId(id).end);

			store.in.exec("move-task", {
				id: 4,
				mode: "before",
				target: 3,
				inProgress: true,
			});
			store.in.exec("move-task", {
				id: 4,
				mode: "before",
				target: 5,
				inProgress: true,
			});
			store.in.exec("move-task", {
				id: 4,
				mode: "before",
				target: 5,
				inProgress: false,
			});

			expect(tasks.byId(4).parent).to.eq(11);
			expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });

			store.in.exec("undo");

			expect(tasks.byId(4).parent).to.eq(parent);
			ids.forEach((id, i) => {
				expect(tasks.byId(id).start).toEqual(start[i]);
				expect(tasks.byId(id).end).toEqual(end[i]);
			});
			expect(store.getState().history).to.deep.eq({ undo: 0, redo: 1 });

			store.in.exec("redo");

			expect(tasks.byId(4).parent).to.eq(11);
			expect(tasks.byId(11).start).toEqual(new Date(2024, 5, 13));
			expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });
		});

		test("replaying an entry does not record a new one", () => {
			resetState({
				...getData("full"),
				summary: { autoConvert: true },
				undo: true,
			});

			store.in.exec("add-task", {
				id: 99,
				task: { text: "kid", type: "task" },
				target: 3,
				mode: "child",
			});
			expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });

			store.in.exec("undo");
			expect(store.getState().history).to.deep.eq({ undo: 0, redo: 1 });

			store.in.exec("redo");
			expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });
		});

		describe("grouped tasks", () => {
			const resources = [
				{ id: "r1", name: "Alex" },
				{ id: "r2", name: "Sophie" },
			];
			const assignments = [
				{ id: 1, task: 1, resource: "r1" },
				{ id: 2, task: 2, resource: "r2" },
			];

			function grouped(undo: boolean) {
				const data = getData();
				return {
					...data,
					links: normalizeLinks(data.links),
					resources,
					assignments,
					groupBy: { field: "resource" },
					...(undo ? { undo: true } : {}),
				};
			}

			function groupedRow() {
				return store.getState().tree.byId(0).data[0].data[0];
			}

			beforeEach(() => vi.useFakeTimers());
			afterEach(() => vi.useRealTimers());

			test("a drag keeps the snapshot it started with", () => {
				store = new DataStore(writable);
				store.init(grouped(true));
				vi.advanceTimersByTime(1);

				const row = groupedRow();
				const { tasks } = store.getState();
				const before = tasks.byId(row.$id).duration;

				store.in.exec("update-task", {
					id: row.id,
					task: { duration: 5 },
					inProgress: true,
				});
				store.in.exec("update-task", {
					id: row.id,
					task: { duration: 5 },
					inProgress: false,
				});

				expect(tasks.byId(row.$id).duration).to.eq(5);
				expect(store.getState().history).to.deep.eq({
					undo: 1,
					redo: 0,
				});

				store.in.exec("undo");
				expect(tasks.byId(row.$id).duration).to.eq(before);
			});

			test("a link id shaped like a grouped row is left alone", () => {
				const data = getData();
				store = new DataStore(writable);
				store.init({
					...data,
					// also the grouped row id of task 1 in group r1
					links: normalizeLinks([
						{ id: "1_r1", source: 1, target: 2, type: "e2s" },
					]),
					resources,
					assignments,
					groupBy: { field: "resource" },
					undo: true,
				});
				vi.advanceTimersByTime(1);

				store.in.exec("delete-link", { id: "1_r1" });
				expect(store.getState().links.map((l: any) => l.id)).to.deep.eq(
					[]
				);

				store.in.exec("undo");
				expect(store.getState().links.map((l: any) => l.id)).to.deep.eq(
					["1_r1"]
				);
			});

			test("an assignment id shaped like a grouped row is left alone", () => {
				const data = getData();
				store = new DataStore(writable);
				store.init({
					...data,
					links: normalizeLinks(data.links),
					resources,
					assignments: [
						{ id: "1_r1", task: 1, resource: "r1", units: 100 },
						{ id: 2, task: 2, resource: "r2", units: 100 },
					],
					groupBy: { field: "resource" },
					undo: true,
				});
				vi.advanceTimersByTime(1);

				const units = () =>
					store.getState().assignments.byId("1_r1")?.units;

				store.in.exec("update-assignment", {
					id: "1_r1",
					assignment: { units: 25 },
				});
				expect(units()).to.eq(25);

				store.in.exec("undo");
				expect(units()).to.eq(100);
			});

			test("a row id that is also a real task id resolves to the row", () => {
				const data = getData();
				// "1_r1" is a real task and the row id of task 1 in group r1
				const config = {
					...data,
					tasks: [
						{
							id: 1,
							text: "one",
							type: "task",
							parent: 0,
							start: day(2),
							end: day(4),
							duration: 2,
						},
						{
							id: "1_r1",
							text: "decoy",
							type: "task",
							parent: 0,
							start: day(6),
							end: day(8),
							duration: 2,
						},
					],
					links: normalizeLinks([]),
					resources,
					assignments: [
						{ id: 1, task: 1, resource: "r1" },
						{ id: 2, task: "1_r1", resource: "r2" },
					],
					groupBy: { field: "resource" },
				};

				store = new DataStore(writable);
				store.init({ ...config });
				vi.advanceTimersByTime(1);
				store.init({ ...config, undo: true });
				vi.advanceTimersByTime(1);

				const tasks = () => store.getState().tasks;

				// the row "1_r1" stands for task 1, not for the task of that id
				store.in.exec("update-task", {
					id: "1_r1",
					task: { text: "edited" },
				});
				vi.advanceTimersByTime(1);
				expect(tasks().byId(1).text).to.eq("edited");

				store.in.exec("undo");
				vi.advanceTimersByTime(1);

				expect(tasks().byId(1).text).to.eq("one");
				expect(tasks().byId("1_r1").text).to.eq("decoy");
			});

			test("a resource move and its cascade are one undo entry", () => {
				const data = getData();
				store = new DataStore(writable);
				store.init({
					...data,
					tasks: [
						{
							id: 1,
							text: "A",
							type: "task",
							parent: 0,
							start: day(2),
							end: day(4),
							duration: 2,
						},
						{
							id: 2,
							text: "B",
							type: "task",
							parent: 0,
							start: day(4),
							end: day(6),
							duration: 2,
						},
					],
					links: normalizeLinks([
						{ id: 1, source: 1, target: 2, type: "e2s" },
					]),
					resources,
					assignments,
					groupBy: { field: "resource" },
					schedule: { auto: true },
					undo: true,
				});
				vi.advanceTimersByTime(1);

				// leave task 2 out of shape so the pass after the move has
				// something to fix, without recording or scheduling it
				store.in.exec("update-task", {
					id: 2,
					task: { start: day(2), end: day(4), duration: 2 },
					eventSource: "update-task",
					skipUndo: true,
				});
				vi.advanceTimersByTime(1);

				const row = (store.getState().tree.byId(0).data as any)[0]
					.data[0];
				const target = (store.getState().tree.byId(0).data as any)[1]
					.data[0];
				const resourcesOf = (id: any) =>
					(store.getState()._assignments?.byTask[id] || []).map(
						(a: any) => a.resource
					);

				store.in.exec("move-task", {
					id: row.id,
					target: target.id,
					mode: "after",
					inProgress: true,
				});
				store.in.exec("move-task", {
					id: row.id,
					target: target.id,
					mode: "after",
					inProgress: false,
				});
				vi.advanceTimersByTime(1);

				expect(resourcesOf(1)).to.deep.eq(["r2"]);
				// the pass ran and pushed task 2 back behind the link
				expect(store.getState().tasks.byId(2).start).to.deep.eq(day(4));
				expect(store.getState().history).to.deep.eq({
					undo: 1,
					redo: 0,
				});

				store.in.exec("undo");
				vi.advanceTimersByTime(1);

				expect(resourcesOf(1)).to.deep.eq(["r1"]);
				expect(store.getState().tasks.byId(2).start).to.deep.eq(day(2));
			});

			test("redo replays a task before its assignment", () => {
				// grouping first, so its listener records the assignment
				// before history sees the task it belongs to
				store = new DataStore(writable);
				store.init(grouped(false));
				vi.advanceTimersByTime(1);
				store.init(grouped(true));
				vi.advanceTimersByTime(1);

				store.in.exec("add-task", {
					id: 99,
					task: { text: "new", type: "task" },
					target: groupedRow().id,
					mode: "after",
				});
				vi.advanceTimersByTime(1);
				store.in.exec("undo");
				vi.advanceTimersByTime(1);

				const replayed: string[] = [];
				const exec = store.in.exec;
				(store.in as any).exec = (name: string, ev: any) => {
					replayed.push(name);
					return (exec as any)(name, ev);
				};

				store.in.exec("redo");
				vi.advanceTimersByTime(1);
				(store.in as any).exec = exec;

				expect(replayed.indexOf("add-task")).to.be.lessThan(
					replayed.indexOf("add-assignment")
				);
			});

			test("an update is recorded when undo is enabled after grouping", () => {
				store = new DataStore(writable);
				store.init(grouped(false));
				vi.advanceTimersByTime(1);
				store.init(grouped(true));
				vi.advanceTimersByTime(1);

				const row = groupedRow();
				const { tasks } = store.getState();
				const before = tasks.byId(row.$id).duration;

				store.in.exec("update-task", {
					id: row.id,
					task: { duration: 5 },
				});

				expect(tasks.byId(row.$id).duration).to.eq(5);
				expect(store.getState().history).to.deep.eq({
					undo: 1,
					redo: 0,
				});

				store.in.exec("undo");
				expect(tasks.byId(row.$id).duration).to.eq(before);
			});
		});

		test("an unbalanced endBatch is a no-op", () => {
			resetState({ ...getData("full"), undo: true });

			const hm = store.getHistory();

			hm.endBatch();
			expect(hm.isBatching()).to.eq(false);

			hm.startBatch();
			expect(hm.isBatching()).to.eq(true);

			store.in.exec("delete-task", { id: 10 });
			store.in.exec("delete-task", { id: 11 });
			hm.endBatch();

			expect(hm.isBatching()).to.eq(false);
			expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });
		});

		test("a summary listener does not split the step", () => {
			resetState({
				...linkedTasks(),
				tasks: [
					{
						id: 10,
						text: "S",
						type: "summary",
						parent: 0,
						open: true,
					},
					{
						id: 1,
						text: "A",
						type: "task",
						parent: 10,
						start: day(2),
						end: day(4),
						duration: 2,
						progress: 0,
					},
					{
						id: 2,
						text: "B",
						type: "task",
						parent: 0,
						start: day(4),
						end: day(6),
						duration: 2,
						progress: 0,
					},
				],
				summary: { autoProgress: true },
			});

			const { tasks } = store.getState();

			store.in.exec("update-task", {
				id: 1,
				task: { start: day(10), end: day(12), duration: 2 },
			});

			expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });

			store.in.exec("undo");

			expect(tasks.byId(1).start).to.deep.eq(day(2));
			expect(tasks.byId(2).start).to.deep.eq(day(4));
		});

		test("a summary recalc caused by skipUndo is not undoable", () => {
			resetState({
				...getData(),
				tasks: [
					{
						id: 10,
						text: "S",
						type: "summary",
						parent: 0,
						open: true,
					},
					{
						id: 1,
						text: "A",
						type: "task",
						parent: 10,
						start: day(2),
						end: day(4),
						duration: 2,
						progress: 0,
					},
					{
						id: 2,
						text: "B",
						type: "task",
						parent: 10,
						start: day(2),
						end: day(4),
						duration: 2,
						progress: 0,
					},
					{
						id: 3,
						text: "C",
						type: "task",
						parent: 0,
						start: day(4),
						end: day(6),
						duration: 2,
						progress: 0,
					},
				],
				links: [],
				summary: { autoProgress: true },
				undo: true,
			});

			const { tasks } = store.getState();

			store.in.exec("update-task", { id: 3, task: { text: "renamed" } });

			// a different task, so undoing the rename cannot restore its
			// snapshot and only the batching can carry the recalc over
			store.in.exec("update-task", {
				id: 1,
				task: { progress: 70 },
				skipUndo: true,
			});
			expect(tasks.byId(10).progress).to.eq(35);
			expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });

			store.in.exec("undo");

			expect(tasks.byId(3).text).to.eq("C");
			expect(tasks.byId(1).progress).to.eq(70);
			// the summary still has to match the kid it is computed from
			expect(tasks.byId(10).progress).to.eq(35);
		});

		test("a skipUndo action does not extend the previous step", () => {
			resetState({
				...getData(),
				tasks: [
					{
						id: 10,
						text: "S",
						type: "summary",
						parent: 0,
						open: true,
					},
					{
						id: 1,
						text: "A",
						type: "task",
						parent: 10,
						start: day(2),
						end: day(4),
						duration: 2,
					},
					{
						id: 2,
						text: "B",
						type: "task",
						parent: 0,
						start: day(4),
						end: day(6),
						duration: 2,
					},
				],
				links: [],
				summary: { autoConvert: true },
				undo: true,
			});

			const { tasks } = store.getState();

			store.in.exec("update-task", { id: 2, task: { text: "renamed" } });

			// deleting the only kid converts the summary back to a task, and
			// none of it is undoable
			store.in.exec("delete-task", { id: 1, skipUndo: true });
			expect(tasks.byId(10).type).to.eq("task");
			expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });

			store.in.exec("undo");

			expect(tasks.byId(2).text).to.eq("B");
			expect(tasks.byId(1)).to.be.undefined;
			expect(tasks.byId(10).type).to.eq("task");
		});

		test("one undo step when undo is enabled after the scheduler", () => {
			const config = linkedTasks();
			config.links = normalizeLinks(config.links);
			delete config.undo;

			store = new DataStore(writable);
			store.init({ ...config });
			// undo toggled on later, so its handlers land behind the scheduler's
			store.init({ ...config, undo: true });

			const { tasks } = store.getState();

			store.in.exec("update-task", {
				id: 1,
				task: { start: day(10), end: day(12), duration: 2 },
			});

			expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });

			store.in.exec("undo");

			expect(tasks.byId(1).start).to.deep.eq(day(2));
			expect(tasks.byId(2).start).to.deep.eq(day(4));
		});
	});

	describe("can handle mass actions", () => {
		test("can set state history correctly", () => {
			const initData = getData("full");
			resetState({
				...initData,
				undo: true,
			});

			const deleteIds = [10, 11, 12];
			const copyIds = [22, 23];

			const hm = store.getHistory();

			hm.startBatch();
			deleteIds.forEach(id => store.in.exec("delete-task", { id }));
			hm.endBatch();

			let { history } = store.getState();

			expect(history).to.deep.eq({
				undo: 1,
				redo: 0,
			});

			hm.startBatch();
			copyIds.forEach(id =>
				store.in.exec("copy-task", { id, target: 3 })
			);
			hm.endBatch();

			({ history } = store.getState());
			expect(history).to.deep.eq({
				undo: 2,
				redo: 0,
			});

			store.in.exec("undo");
			({ history } = store.getState());
			expect(history).to.deep.eq({
				undo: 1,
				redo: 1,
			});

			store.in.exec("undo");
			({ history } = store.getState());
			expect(history).to.deep.eq({
				undo: 0,
				redo: 2,
			});

			store.in.exec("redo");
			({ history } = store.getState());
			expect(history).to.deep.eq({
				undo: 1,
				redo: 1,
			});

			store.in.exec("redo");
			({ history } = store.getState());
			expect(history).to.deep.eq({
				undo: 2,
				redo: 0,
			});
		});

		test("scheduling inside an outer batch stays one undo step", () => {
			resetState({
				...getData(),
				tasks: [
					{
						id: 1,
						text: "A",
						type: "task",
						parent: 0,
						start: new Date(2024, 0, 1),
						end: new Date(2024, 0, 5),
						duration: 4,
					},
					{
						id: 2,
						text: "B",
						type: "task",
						parent: 0,
						start: new Date(2024, 0, 5),
						end: new Date(2024, 0, 9),
						duration: 4,
					},
				],
				links: [{ id: 1, source: 1, target: 2, type: "e2s" }],
				schedule: { auto: true },
				undo: true,
			});

			const { tasks } = store.getState();
			const a0 = tasks.byId(1).start;
			const b0 = tasks.byId(2).start;
			const hm = store.getHistory();

			// each edit adds its scheduling cascade to the surrounding batch
			hm.startBatch();
			store.in.exec("update-task", {
				id: 1,
				task: { start: new Date(2024, 0, 10), duration: 4 },
			});
			store.in.exec("update-task", {
				id: 1,
				task: { start: new Date(2024, 0, 15), duration: 4 },
			});
			hm.endBatch();

			expect(store.getState().history.undo).to.eq(1);

			store.in.exec("undo");
			expect(tasks.byId(1).start).to.deep.eq(a0);
			expect(tasks.byId(2).start).to.deep.eq(b0);
			expect(store.getState().history.undo).to.eq(0);
		});

		test("undo restores a reparented task and its scheduled link", () => {
			resetState({
				...getData(),
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
						text: "Child",
						type: "task",
						parent: 1,
						start: new Date(2024, 0, 1),
						end: new Date(2024, 0, 3),
						duration: 2,
					},
					{
						id: 3,
						text: "Sibling",
						type: "task",
						parent: 0,
						start: new Date(2024, 0, 3),
						end: new Date(2024, 0, 5),
						duration: 2,
					},
				],
				links: [{ id: 10, source: 1, target: 3, type: "e2s" }],
				schedule: { auto: true },
				undo: true,
			});

			const history = store.getHistory();
			history.startBatch();
			store.in.exec("move-task", { id: 3, target: 1, mode: "child" });
			history.endBatch();

			expect(store.getState().tasks.byId(3).parent).to.eq(1);
			expect(store.getState().links.byId(10)).to.be.undefined;
			expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });

			store.in.exec("undo");

			expect(store.getState().tasks.byId(3).parent).to.eq(0);
			expect(store.getState().links.byId(10)).to.exist;
			expect(store.getState().history).to.deep.eq({ undo: 0, redo: 1 });
		});

		describe("delete-task", () => {
			test("can undo/redo after deleting tasks", () => {
				const initData = getData("full");
				resetState({
					...initData,
					undo: true,
				});

				const hm = store.getHistory();
				const { tasks, links } = store.getState();
				expect(tasks.toArray().length).to.eq(19);
				expect(links.map(l => l).length).to.eq(7);

				const deleteIds = [20, 21, 23];
				const deleteIds2 = [10, 31];

				hm.startBatch();
				deleteIds.forEach(id => store.in.exec("delete-task", { id }));
				hm.endBatch();

				expect(tasks.toArray().length).to.eq(16);
				expect(links.map(l => l.id)).to.deep.equal([1, 2, 3, 7]);

				store.in.exec("undo");
				expect(tasks.toArray().length).to.eq(19);
				expect(tasks.byId(2).data?.map(d => d.id)).to.deep.equal([
					20, 21, 22, 23,
				]);
				expect(links.map(l => l.id).sort()).to.deep.equal([
					1, 2, 3, 4, 5, 6, 7,
				]);

				store.in.exec("redo");
				expect(tasks.toArray().length).to.eq(16);
				expect(tasks.byId(2).data?.map(d => d.id)).to.deep.equal([22]);
				expect(links.map(l => l.id).sort()).to.deep.equal([1, 2, 3, 7]);

				// to undo all changes
				store.in.exec("undo");

				hm.startBatch();
				deleteIds.forEach(id => store.in.exec("delete-task", { id }));
				hm.endBatch();

				hm.startBatch();
				deleteIds2.forEach(id => store.in.exec("delete-task", { id }));
				hm.endBatch();

				expect(tasks.toArray().length).to.eq(14);
				expect(links.map(l => l.id).sort()).to.deep.equal([2, 3, 7]);

				store.in.exec("undo");
				expect(tasks.toArray().length).to.eq(16);
				expect(tasks.byId(1).data?.map(d => d.id)).to.deep.equal([
					10, 11, 12,
				]);
				expect(tasks.byId(2).data?.map(d => d.id)).to.deep.equal([22]);
				expect(tasks.byId(3).data?.map(d => d.id)).to.deep.equal([
					30, 31, 32,
				]);
				expect(links.map(l => l.id).sort()).to.deep.equal([1, 2, 3, 7]);

				store.in.exec("undo");
				expect(tasks.toArray().length).to.eq(19);
				expect(tasks.byId(2).data?.map(d => d.id)).to.deep.equal([
					20, 21, 22, 23,
				]);
				expect(links.map(l => l.id).sort()).to.deep.equal([
					1, 2, 3, 4, 5, 6, 7,
				]);

				store.in.exec("redo");
				expect(tasks.toArray().length).to.eq(16);
				expect(tasks.byId(1).data?.map(d => d.id)).to.deep.equal([
					10, 11, 12,
				]);
				expect(tasks.byId(2).data?.map(d => d.id)).to.deep.equal([22]);
				expect(tasks.byId(3).data?.map(d => d.id)).to.deep.equal([
					30, 31, 32,
				]);
				expect(links.map(l => l.id).sort()).to.deep.equal([1, 2, 3, 7]);

				store.in.exec("redo");
				expect(tasks.toArray().length).to.eq(14);
				expect(tasks.byId(1).data?.map(d => d.id)).to.deep.equal([
					11, 12,
				]);
				expect(tasks.byId(2).data?.map(d => d.id)).to.deep.equal([22]);
				expect(tasks.byId(3).data?.map(d => d.id)).to.deep.equal([
					30, 32,
				]);
				expect(links.map(l => l.id).sort()).to.deep.equal([2, 3, 7]);
			});

			test("can undo/redo after deleting tasks with childs", () => {
				const initData = getData("full");
				resetState({
					...initData,
					undo: true,
				});

				const hm = store.getHistory();
				const { tasks, links } = store.getState();

				const deleteIds = [11, 2];

				hm.startBatch();
				deleteIds.forEach(id => store.in.exec("delete-task", { id }));
				hm.endBatch();

				store.in.exec("undo");
				expect(tasks.toArray().length).to.eq(19);
				expect(tasks.byId(11).data?.map(d => d.id)).to.deep.equal([
					110, 111, 112, 113,
				]);
				expect(links.map(l => l.id).sort()).to.deep.equal([
					1, 2, 3, 4, 5, 6, 7,
				]);

				store.in.exec("redo");
				expect(tasks.toArray().length).to.eq(13);
				expect(tasks.byId(11)).to.eq(undefined);
				expect(tasks.byId(2)).to.eq(undefined);
				expect(links.map(l => l.id).sort()).to.deep.equal([7]);
			});

			test("can undo/redo after deleting all childs", () => {
				const initData = getData("full");
				resetState({
					...initData,
					undo: true,
				});

				const hm = store.getHistory();
				const { tasks } = store.getState();

				const deleteIds = [110, 112, 113, 111];
				const deleteIds2 = [11, 10, 12];

				hm.startBatch();
				deleteIds.forEach(id => store.in.exec("delete-task", { id }));
				hm.endBatch();

				hm.startBatch();
				deleteIds2.forEach(id => store.in.exec("delete-task", { id }));
				hm.endBatch();

				store.in.exec("undo");
				expect(!!tasks.byId(11).data).to.eq(false);
				expect(tasks.byId(1).data?.map(d => d.id)).to.deep.equal([
					10, 11, 12,
				]);

				store.in.exec("undo");
				expect(tasks.byId(11).data?.map(d => d.id)).to.deep.equal([
					110, 111, 112, 113,
				]);
				expect(tasks.byId(1).data?.map(d => d.id)).to.deep.equal([
					10, 11, 12,
				]);

				store.in.exec("redo");
				expect(!!tasks.byId(11).data).to.eq(false);
				expect(tasks.byId(1).data?.map(d => d.id)).to.deep.equal([
					10, 11, 12,
				]);

				store.in.exec("redo");
				expect(!!tasks.byId(1).data).to.eq(false);
			});

			test("can undo/redo after deleting tasks (summary tasks)", () => {
				const initData = getData("summaries");
				resetState({
					...initData,
					undo: true,
				});

				const hm = store.getHistory();
				const { tasks } = store.getState();

				const deleteIds = [11, 2, 6];
				const deleteIds2 = [17, 10];

				hm.startBatch();
				deleteIds.forEach(id => store.in.exec("delete-task", { id }));
				hm.endBatch();

				hm.startBatch();
				deleteIds2.forEach(id => store.in.exec("delete-task", { id }));
				hm.endBatch();

				store.in.exec("undo");
				expect(tasks.byId(8).data?.map(d => d.id)).to.deep.equal([
					4, 10,
				]);
				expect(!!tasks.byId(10).data).to.eq(false);
				expect(tasks.byId(8).duration).to.eq(4);
				expect(tasks.byId(1).duration).to.eq(4);

				store.in.exec("undo");
				expect(tasks.byId(8).data?.map(d => d.id)).to.deep.equal([
					4, 10, 11,
				]);
				expect(tasks.byId(10).data?.map(d => d.id)).to.deep.equal([
					2, 6,
				]);
				expect(tasks.byId(8).duration).to.eq(8);
				expect(tasks.byId(1).duration).to.eq(8);

				store.in.exec("redo");
				expect(tasks.byId(8).data?.map(d => d.id)).to.deep.equal([
					4, 10,
				]);
				expect(!!tasks.byId(10).data).to.eq(false);
				expect(tasks.byId(8).duration).to.eq(4);
				expect(tasks.byId(1).duration).to.eq(4);

				store.in.exec("redo");
				expect(tasks.byId(14).data?.map(d => d.id)).to.deep.equal([
					15, 16,
				]);
				expect(tasks.byId(8).data?.map(d => d.id)).to.deep.equal([4]);
				expect(tasks.byId(14).duration).to.eq(13);
				expect(tasks.byId(8).duration).to.eq(1);
				expect(tasks.byId(1).duration).to.eq(3);
			});
		});

		describe("add-task", () => {
			test("can undo/redo after adding tasks below", () => {
				const initData = getData("full");
				resetState({
					...initData,
					undo: true,
				});

				const hm = store.getHistory();
				const { tasks } = store.getState();

				const ids = [10, 2, 23];
				const ids2 = ["2-1", 31, "23-1"];

				hm.startBatch();
				ids.forEach(id =>
					store.in.exec("add-task", {
						target: id,
						mode: "after",
						task: { id: `${id}-1` },
					})
				);
				hm.endBatch();

				store.in.exec("undo");
				expect(tasks.toArray().length).to.eq(19);

				store.in.exec("redo");
				expect(tasks.toArray().length).to.eq(22);
				expect(tasks.byId(1).data?.map(d => d.id)).to.deep.equal([
					10,
					"10-1",
					11,
					12,
				]);
				expect(tasks.byId(2).data?.map(d => d.id)).to.deep.equal([
					20,
					21,
					22,
					23,
					"23-1",
				]);
				expect(tasks.getBranch("2-1")?.map(d => d.id)).to.deep.equal([
					1,
					2,
					"2-1",
					3,
					4,
					5,
				]);

				// to undo all changes
				store.in.exec("undo");

				hm.startBatch();
				ids.forEach(id =>
					store.in.exec("add-task", {
						target: id,
						mode: "after",
						task: { id: `${id}-1` },
					})
				);
				hm.endBatch();

				hm.startBatch();
				ids2.forEach(id =>
					store.in.exec("add-task", {
						target: id,
						mode: "after",
						task: { id: `${id}-2` },
					})
				);
				hm.endBatch();

				store.in.exec("undo");
				expect(tasks.toArray().length).to.eq(22);
				expect(tasks.byId(1).data?.map(d => d.id)).to.deep.equal([
					10,
					"10-1",
					11,
					12,
				]);
				expect(tasks.byId(2).data?.map(d => d.id)).to.deep.equal([
					20,
					21,
					22,
					23,
					"23-1",
				]);
				expect(tasks.getBranch("2-1")?.map(d => d.id)).to.deep.equal([
					1,
					2,
					"2-1",
					3,
					4,
					5,
				]);

				store.in.exec("undo");
				expect(tasks.toArray().length).to.eq(19);

				store.in.exec("redo");
				expect(tasks.toArray().length).to.eq(22);
				expect(tasks.byId(1).data?.map(d => d.id)).to.deep.equal([
					10,
					"10-1",
					11,
					12,
				]);
				expect(tasks.byId(2).data?.map(d => d.id)).to.deep.equal([
					20,
					21,
					22,
					23,
					"23-1",
				]);
				expect(tasks.getBranch("2-1")?.map(d => d.id)).to.deep.equal([
					1,
					2,
					"2-1",
					3,
					4,
					5,
				]);

				store.in.exec("redo");
				expect(tasks.toArray().length).to.eq(25);
				expect(tasks.byId(1).data?.map(d => d.id)).to.deep.equal([
					10,
					"10-1",
					11,
					12,
				]);
				expect(tasks.byId(2).data?.map(d => d.id)).to.deep.equal([
					20,
					21,
					22,
					23,
					"23-1",
					"23-1-2",
				]);
				expect(tasks.getBranch("2-1")?.map(d => d.id)).to.deep.equal([
					1,
					2,
					"2-1",
					"2-1-2",
					3,
					4,
					5,
				]);
			});

			test("can undo/redo after adding tasks above", () => {
				const initData = getData("full");
				resetState({
					...initData,
					undo: true,
				});

				const hm = store.getHistory();
				const { tasks } = store.getState();

				const ids = [1, 21, 32];
				const ids2 = ["1-1", "32-1", 4];

				hm.startBatch();
				ids.forEach(id =>
					store.in.exec("add-task", {
						target: id,
						mode: "before",
						task: { id: `${id}-1` },
					})
				);
				hm.endBatch();

				store.in.exec("undo");
				expect(tasks.toArray().length).to.eq(19);

				store.in.exec("redo");
				expect(tasks.toArray().length).to.eq(22);
				expect(tasks.getBranch("1-1")?.map(d => d.id)).to.deep.equal([
					"1-1",
					1,
					2,
					3,
					4,
					5,
				]);
				expect(tasks.byId(2).data?.map(d => d.id)).to.deep.equal([
					20,
					"21-1",
					21,
					22,
					23,
				]);
				expect(tasks.byId(3).data?.map(d => d.id)).to.deep.equal([
					30,
					31,
					"32-1",
					32,
				]);

				// to undo all changes
				store.in.exec("undo");

				hm.startBatch();
				ids.forEach(id =>
					store.in.exec("add-task", {
						target: id,
						mode: "before",
						task: { id: `${id}-1` },
					})
				);
				hm.endBatch();

				hm.startBatch();
				ids2.forEach(id =>
					store.in.exec("add-task", {
						target: id,
						mode: "before",
						task: { id: `${id}-2` },
					})
				);
				hm.endBatch();

				store.in.exec("undo");
				expect(tasks.toArray().length).to.eq(22);
				expect(tasks.getBranch("1-1")?.map(d => d.id)).to.deep.equal([
					"1-1",
					1,
					2,
					3,
					4,
					5,
				]);
				expect(tasks.byId(2).data?.map(d => d.id)).to.deep.equal([
					20,
					"21-1",
					21,
					22,
					23,
				]);
				expect(tasks.byId(3).data?.map(d => d.id)).to.deep.equal([
					30,
					31,
					"32-1",
					32,
				]);

				store.in.exec("undo");
				expect(tasks.toArray().length).to.eq(19);

				store.in.exec("redo");
				expect(tasks.toArray().length).to.eq(22);
				expect(tasks.getBranch("1-1")?.map(d => d.id)).to.deep.equal([
					"1-1",
					1,
					2,
					3,
					4,
					5,
				]);
				expect(tasks.byId(2).data?.map(d => d.id)).to.deep.equal([
					20,
					"21-1",
					21,
					22,
					23,
				]);
				expect(tasks.byId(3).data?.map(d => d.id)).to.deep.equal([
					30,
					31,
					"32-1",
					32,
				]);

				store.in.exec("redo");
				expect(tasks.toArray().length).to.eq(25);
				expect(tasks.getBranch("1-1")?.map(d => d.id)).to.deep.equal([
					"1-1-2",
					"1-1",
					1,
					2,
					3,
					"4-2",
					4,
					5,
				]);
				expect(tasks.byId(3).data?.map(d => d.id)).to.deep.equal([
					30,
					31,
					"32-1-2",
					"32-1",
					32,
				]);
			});

			test("can undo/redo after adding tasks as childs", () => {
				const initData = getData("full");
				resetState({
					...initData,
					undo: true,
				});

				const hm = store.getHistory();
				const { tasks } = store.getState();

				const ids = [21, 23];
				const ids2 = [2, 21, "21-1", 3];

				hm.startBatch();
				ids.forEach(id =>
					store.in.exec("add-task", {
						target: id,
						mode: "child",
						task: { id: `${id}-1` },
					})
				);
				hm.endBatch();

				hm.startBatch();
				ids2.forEach(id =>
					store.in.exec("add-task", {
						target: id,
						mode: "child",
						task: { id: `${id}-2` },
					})
				);
				hm.endBatch();

				store.in.exec("undo");
				expect(tasks.byId(2).data?.map(d => d.id)).to.deep.equal([
					20, 21, 22, 23,
				]);
				expect(tasks.byId(21).data?.map(d => d.id)).to.deep.equal([
					"21-1",
				]);
				expect(!!tasks.byId("21-1").data).to.eq(false);
				expect(tasks.byId(23).data?.map(d => d.id)).to.deep.equal([
					"23-1",
				]);
				expect(tasks.byId(3).data?.map(d => d.id)).to.deep.equal([
					30, 31, 32,
				]);

				store.in.exec("undo");
				expect(!!tasks.byId(21).data).to.eq(false);
				expect(!!tasks.byId(23).data).to.eq(false);

				store.in.exec("redo");
				expect(tasks.byId(2).data?.map(d => d.id)).to.deep.equal([
					20, 21, 22, 23,
				]);
				expect(tasks.byId(21).data?.map(d => d.id)).to.deep.equal([
					"21-1",
				]);
				expect(!!tasks.byId("21-1").data).to.eq(false);
				expect(tasks.byId(23).data?.map(d => d.id)).to.deep.equal([
					"23-1",
				]);
				expect(tasks.byId(3).data?.map(d => d.id)).to.deep.equal([
					30, 31, 32,
				]);

				store.in.exec("redo");
				expect(tasks.byId(2).data?.map(d => d.id)).to.deep.equal([
					20,
					21,
					22,
					23,
					"2-2",
				]);
				expect(tasks.byId(21).data?.map(d => d.id)).to.deep.equal([
					"21-1",
					"21-2",
				]);
				expect(tasks.byId("21-1").data?.map(d => d.id)).to.deep.equal([
					"21-1-2",
				]);
				expect(tasks.byId(23).data?.map(d => d.id)).to.deep.equal([
					"23-1",
				]);
				expect(tasks.byId(3).data?.map(d => d.id)).to.deep.equal([
					30,
					31,
					32,
					"3-2",
				]);
			});
		});

		describe("copy-task", () => {
			test("can undo/redo after copying tasks", () => {
				const initData = getData("full");
				resetState({
					...initData,
					undo: true,
				});

				const hm = store.getHistory();
				const { tasks, links } = store.getState();
				expect(tasks.toArray().length).to.eq(19);
				expect(links.map(l => l).length).to.eq(7);

				const ids = [23, 11];
				const ids2 = [32, 21, 10];

				hm.startBatch();
				ids.forEach(id =>
					store.in.exec("copy-task", {
						id,
						target: 30,
						mode: "after",
					})
				);
				hm.endBatch();

				hm.startBatch();
				ids2.forEach(id =>
					store.in.exec("copy-task", {
						id,
						target: 31,
						mode: "after",
					})
				);
				hm.endBatch();

				store.in.exec("undo");
				expect(tasks.byId(3).data?.length).to.eq(5);
				expect(tasks.byId(3).data?.[3]?.id).to.eq(31);
				expect(tasks.byId(3).data?.[1]?.data?.length).to.eq(4);
				expect(links.map(l => l).length).to.eq(8);

				store.in.exec("undo");
				expect(tasks.byId(3).data?.length).to.eq(3);
				expect(links.map(l => l).length).to.eq(7);

				store.in.exec("redo");
				expect(tasks.byId(3).data?.length).to.eq(5);
				expect(tasks.byId(3).data?.[1]?.data?.length).to.eq(4);
				expect(links.map(l => l).length).to.eq(8);

				store.in.exec("redo");
				expect(tasks.byId(3).data?.length).to.eq(8);
				expect(tasks.byId(3).data?.[3]?.id).to.eq(31);
				expect(tasks.byId(3).data?.[1]?.data?.length).to.eq(4);
				expect(tasks.byId(3).data?.[7]?.id).to.eq(32);
				expect(links.map(l => l).length).to.eq(8);
			});
		});
	});

	describe("auto scheduling", () => {
		test("keeps history empty after init", () => {
			resetState({
				...getData("autoScheduling"),
				undo: true,
				schedule: { auto: true },
			});

			const { tasks, history } = store.getState();
			// the initial pass did reschedule, it is just not recorded
			expect(tasks.byId(5).start).to.deep.eq(new Date(2024, 3, 7));
			expect(history).to.deep.eq({ undo: 0, redo: 0 });
		});

		test("keeps history empty after dataset replacement", () => {
			resetState({
				...getData("autoScheduling"),
				undo: true,
				schedule: { auto: true },
			});

			const data = getData("autoScheduling");
			data.links = normalizeLinks(data.links);
			// move the head of the 3 -> 4 -> 5 chain, otherwise the replacement
			// is deep equal to the initial data and nothing is rescheduled
			data.tasks = data.tasks.map((t: any) =>
				t.id === 3 ? { ...t, end: new Date(2024, 3, 9) } : t
			);
			store.init({ ...data, undo: true, schedule: { auto: true } });

			const { tasks, history } = store.getState();
			expect(tasks.byId(5).start).to.deep.eq(new Date(2024, 3, 11));
			expect(history).to.deep.eq({ undo: 0, redo: 0 });
		});

		test("keeps history empty after provide-data", () => {
			resetState({
				...getData("lazy"),
				undo: true,
				schedule: { auto: true },
			});

			store.in.exec("provide-data", {
				id: 2,
				data: {
					tasks: [
						{
							id: 20,
							text: "Task 20",
							type: "task",
							parent: 2,
							start: new Date(2024, 3, 2),
							end: new Date(2024, 3, 5),
						},
						{
							id: 21,
							text: "Task 21",
							type: "task",
							parent: 2,
							start: new Date(2024, 3, 2),
							end: new Date(2024, 3, 5),
						},
					],
					links: [{ id: 10, source: 20, target: 21, type: "e2s" }],
				},
			});

			const { tasks, history } = store.getState();
			expect(tasks.byId(21).start).to.deep.eq(new Date(2024, 3, 5));
			expect(history).to.deep.eq({ undo: 0, redo: 0 });
		});

		test("keeps summary updates derived from scheduling out of history", () => {
			resetState({
				...getData("summaries"),
				undo: true,
				schedule: { auto: true },
				summary: { autoProgress: true, autoConvert: true },
			});

			const { tasks, history } = store.getState();
			expect(tasks.byId(7).start).to.deep.eq(new Date(2024, 5, 14));
			expect(history).to.deep.eq({ undo: 0, redo: 0 });
		});
	});

	describe("disabled history", () => {
		test("does not record actions after undo is turned off", () => {
			const initData = getData();
			resetState({
				...initData,
				undo: true,
			});

			store.in.exec("add-task", { id: 7, task: {} });
			expect(store.getState().history).to.deep.eq({
				undo: 1,
				redo: 0,
			});

			store.init({ undo: false });
			expect(store.getState().history).to.eq(null);

			store.in.exec("add-task", { id: 8, task: {} });
			expect(store.getState().history).to.eq(null);
		});
	});

	describe("dataset replacement", () => {
		const resources = [
			{ id: "r1", name: "Alex" },
			{ id: "r2", name: "Sophie" },
		];

		test("resets history when only links are replaced", () => {
			const initData = getData();
			resetState({
				...initData,
				undo: true,
			});

			store.in.exec("delete-link", { id: 1 });
			expect(store.getState().history).to.deep.eq({
				undo: 1,
				redo: 0,
			});

			store.init({
				...initData,
				undo: true,
				links: [{ id: 2, source: 2, target: 3, type: "e2s" }],
			});

			expect(store.getState().history).to.deep.eq({
				undo: 0,
				redo: 0,
			});
		});

		test("does not restore a link of the replaced dataset on undo", () => {
			const initData = getData();
			resetState({
				...initData,
				undo: true,
			});

			store.in.exec("delete-link", { id: 1 });

			store.init({
				...initData,
				undo: true,
				links: [{ id: 2, source: 2, target: 3, type: "e2s" }],
			});
			store.in.exec("undo");

			const { links } = store.getState();
			expect(links.map(l => l.id)).to.deep.eq([2]);
		});

		test("resets history when only resources are replaced", () => {
			const initData = getData();
			resetState({
				...initData,
				undo: true,
				resources,
			});

			store.in.exec("delete-link", { id: 1 });

			store.init({
				...initData,
				undo: true,
				resources: [{ id: "r3", name: "James" }],
			});

			expect(store.getState().history).to.deep.eq({
				undo: 0,
				redo: 0,
			});
		});

		test("resets history when only assignments are replaced", () => {
			const initData = getData();
			resetState({
				...initData,
				undo: true,
				resources,
				assignments: [{ id: 1, task: 1, resource: "r1" }],
			});

			store.in.exec("delete-link", { id: 1 });

			store.init({
				...initData,
				undo: true,
				resources,
				assignments: [{ id: 2, task: 2, resource: "r2" }],
			});

			expect(store.getState().history).to.deep.eq({
				undo: 0,
				redo: 0,
			});
		});

		test("keeps history when the config update carries the same data", () => {
			const initData = { ...getData(), undo: true };
			resetState(initData);

			store.in.exec("delete-link", { id: 1 });

			store.init({ ...initData });

			expect(store.getState().history).to.deep.eq({
				undo: 1,
				redo: 0,
			});
		});
	});

	describe("becoming a summary drops assignments", () => {
		beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
		afterEach(() => vi.useRealTimers());

		const resources = [
			{ id: "r1", name: "Alex" },
			{ id: "r2", name: "Sophie" },
		];

		function assigned(
			list: { id: number; task: number; resource: string }[],
			extra: Record<string, unknown> = {}
		) {
			const initData = getData();
			resetState({
				...initData,
				tasks: [
					{
						id: 1,
						text: "QA",
						type: "task",
						parent: 0,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 5),
						duration: 3,
					},
				],
				links: [],
				resources,
				assignments: list,
				undo: true,
				...extra,
			});
		}

		function assignmentIds() {
			return store
				.getState()
				.assignments.map((a: IAssignment) => a)
				.filter(a => a.task === 1)
				.map(a => a.id)
				.sort();
		}

		function watchDeletes() {
			const deleted: {
				id: TID;
				joinUndo?: boolean;
				eventSource?: string;
			}[] = [];
			store.in.on("delete-assignment", ev => {
				deleted.push({
					id: ev.id,
					joinUndo: ev.joinUndo,
					eventSource: ev.eventSource,
				});
			});
			return deleted;
		}

		function watchAdds() {
			const added: { eventSource?: string }[] = [];
			store.in.on("add-assignment", ev => {
				added.push({ eventSource: ev.eventSource });
			});
			return added;
		}

		test("one assignment is removed with the type change and restored on undo", () => {
			assigned([{ id: 1, task: 1, resource: "r1" }]);
			const deleted = watchDeletes();

			store.in.exec("update-task", {
				id: 1,
				task: { type: "summary" },
			});

			expect(store.getState().tasks.byId(1).type).to.eq("summary");
			expect(assignmentIds()).to.deep.eq([]);
			expect(deleted).to.deep.eq([
				{ id: 1, joinUndo: true, eventSource: "update-task" },
			]);
			expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });

			vi.advanceTimersByTime(1);
			store.in.exec("undo");

			expect(store.getState().tasks.byId(1).type).to.eq("task");
			expect(assignmentIds()).to.deep.eq([1]);
			expect(store.getState().history).to.deep.eq({ undo: 0, redo: 1 });

			deleted.length = 0;
			const added = watchAdds();
			store.in.exec("redo");

			expect(store.getState().tasks.byId(1).type).to.eq("summary");
			expect(assignmentIds()).to.deep.eq([]);
			expect(deleted.map(ev => ev.id)).to.deep.eq([1]);
			expect(added).to.deep.eq([]);
			expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });
		});

		test("several assignments are removed and restored together", () => {
			assigned([
				{ id: 1, task: 1, resource: "r1" },
				{ id: 2, task: 1, resource: "r2" },
			]);
			const deleted = watchDeletes();

			store.in.exec("update-task", {
				id: 1,
				task: { type: "summary" },
			});

			expect(assignmentIds()).to.deep.eq([]);
			expect(deleted.map(ev => ev.id).sort()).to.deep.eq([1, 2]);
			expect(
				deleted.every(
					ev =>
						ev.joinUndo === true && ev.eventSource === "update-task"
				)
			).to.eq(true);
			expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });

			vi.advanceTimersByTime(1);
			store.in.exec("undo");

			expect(store.getState().tasks.byId(1).type).to.eq("task");
			expect(assignmentIds()).to.deep.eq([1, 2]);

			deleted.length = 0;
			store.in.exec("redo");

			expect(store.getState().tasks.byId(1).type).to.eq("summary");
			expect(assignmentIds()).to.deep.eq([]);
			expect(deleted.map(ev => ev.id).sort()).to.deep.eq([1, 2]);
		});

		test("updating a summary that has no assignments sends no delete", () => {
			assigned([{ id: 1, task: 1, resource: "r1" }]);
			store.in.exec("update-task", {
				id: 1,
				task: { type: "summary" },
			});

			const deleted = watchDeletes();
			const added = watchAdds();
			store.in.exec("update-task", {
				id: 1,
				task: { text: "Release" },
			});

			expect(deleted).to.deep.eq([]);
			expect(added).to.deep.eq([]);
			expect(store.getState().tasks.byId(1).text).to.eq("Release");
			expect(assignmentIds()).to.deep.eq([]);

			vi.advanceTimersByTime(1);
			store.in.exec("undo");
			store.in.exec("undo");
			added.length = 0;
			deleted.length = 0;
			store.in.exec("redo");

			expect(store.getState().tasks.byId(1).type).to.eq("summary");
			expect(assignmentIds()).to.deep.eq([]);
			expect(added).to.deep.eq([]);
			expect(deleted.map(ev => ev.id)).to.deep.eq([1]);
		});

		test("autoConvert joins add-task, type change and deletes in one step", () => {
			assigned([{ id: 1, task: 1, resource: "r1" }], {
				summary: { autoConvert: true },
			});
			const deleted = watchDeletes();
			const added = watchAdds();

			store.in.exec("add-task", {
				id: 2,
				task: { id: 2, text: "Regression", type: "task" },
				target: 1,
				mode: "child",
			});

			expect(store.getState().tasks.byId(1).type).to.eq("summary");
			expect(store.getState().tasks.byId(2).parent).to.eq(1);
			expect(assignmentIds()).to.deep.eq([]);
			expect(deleted).to.deep.eq([
				{ id: 1, joinUndo: true, eventSource: "update-task" },
			]);
			expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });

			vi.advanceTimersByTime(1);
			store.in.exec("undo");

			expect(store.getState().tasks.byId(1).type).to.eq("task");
			expect(store.getState().tasks.byId(2)).to.eq(undefined);
			expect(assignmentIds()).to.deep.eq([1]);
			expect(store.getState().history).to.deep.eq({ undo: 0, redo: 1 });

			added.length = 0;
			deleted.length = 0;
			store.in.exec("redo");

			expect(store.getState().tasks.byId(1).type).to.eq("summary");
			expect(store.getState().tasks.byId(2).parent).to.eq(1);
			expect(assignmentIds()).to.deep.eq([]);
			expect(added).to.deep.eq([]);
			expect(deleted.map(ev => ev.id)).to.deep.eq([1]);
			expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });
		});

		test("autoConvert joins move-task, type change and deletes in one step", () => {
			assigned([{ id: 1, task: 1, resource: "r1" }], {
				summary: { autoConvert: true },
				tasks: [
					{
						id: 1,
						text: "QA",
						type: "task",
						parent: 0,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 5),
						duration: 3,
					},
					{
						id: 2,
						text: "Regression",
						type: "task",
						parent: 0,
						start: new Date(2024, 3, 6),
						end: new Date(2024, 3, 8),
						duration: 2,
					},
				],
			});
			const deleted = watchDeletes();

			store.in.exec("move-task", {
				id: 2,
				target: 1,
				mode: "child",
			});

			expect(store.getState().tasks.byId(1).type).to.eq("summary");
			expect(store.getState().tasks.byId(2).parent).to.eq(1);
			expect(assignmentIds()).to.deep.eq([]);
			expect(deleted).to.deep.eq([
				{ id: 1, joinUndo: true, eventSource: "update-task" },
			]);
			expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });

			vi.advanceTimersByTime(1);
			store.in.exec("undo");

			expect(store.getState().tasks.byId(1).type).to.eq("task");
			expect(store.getState().tasks.byId(2).parent).to.eq(0);
			expect(assignmentIds()).to.deep.eq([1]);
			expect(store.getState().history).to.deep.eq({ undo: 0, redo: 1 });

			deleted.length = 0;
			vi.advanceTimersByTime(1);
			store.in.exec("redo");

			expect(store.getState().tasks.byId(1).type).to.eq("summary");
			expect(store.getState().tasks.byId(2).parent).to.eq(1);
			expect(assignmentIds()).to.deep.eq([]);
			expect(deleted.map(ev => ev.id)).to.deep.eq([1]);
			expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });
		});

		test("autoConvert joins move-task out of a summary in one step", () => {
			assigned([], {
				summary: { autoConvert: true },
				tasks: [
					{
						id: 1,
						text: "QA",
						type: "summary",
						parent: 0,
						open: true,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 8),
						duration: 4,
					},
					{
						id: 2,
						text: "Regression",
						type: "task",
						parent: 1,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 5),
						duration: 3,
					},
				],
			});
			const typeChanges: {
				id: TID;
				type?: string;
				eventSource?: string;
			}[] = [];
			store.in.on("update-task", ev => {
				if (ev.task && "type" in ev.task)
					typeChanges.push({
						id: ev.id,
						type: ev.task.type,
						eventSource: ev.eventSource,
					});
			});

			store.in.exec("move-task", {
				id: 2,
				target: 1,
				mode: "before",
			});

			expect(store.getState().tasks.byId(1).type).to.eq("task");
			expect(store.getState().tasks.byId(2).parent).to.eq(0);
			expect(typeChanges).to.deep.eq([
				{ id: 1, type: "task", eventSource: undefined },
			]);
			expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });

			vi.advanceTimersByTime(1);
			typeChanges.length = 0;
			store.in.exec("undo");

			expect(store.getState().tasks.byId(1).type).to.eq("summary");
			expect(store.getState().tasks.byId(2).parent).to.eq(1);
			expect(typeChanges).to.deep.eq([
				// history restores the recorded type
				{ id: 1, type: "summary", eventSource: "undo" },
				// child is back, so the summary span is re-derived
				{ id: 1, type: "summary", eventSource: "move-task" },
			]);
			expect(store.getState().history).to.deep.eq({ undo: 0, redo: 1 });

			vi.advanceTimersByTime(1);
			typeChanges.length = 0;
			store.in.exec("redo");

			expect(store.getState().tasks.byId(1).type).to.eq("task");
			expect(store.getState().tasks.byId(2).parent).to.eq(0);
			expect(typeChanges).to.deep.eq([
				{ id: 1, type: "task", eventSource: "redo" },
			]);
			expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });
		});

		test("add-assignment on a summary records no history", () => {
			assigned([], {
				tasks: [
					{
						id: 1,
						text: "Release",
						type: "summary",
						parent: 0,
						start: new Date(2024, 3, 2),
						end: new Date(2024, 3, 5),
						duration: 3,
					},
				],
			});

			store.in.exec("add-assignment", {
				assignment: { task: 1, resource: "r1" },
			});

			expect(assignmentIds()).to.deep.eq([]);
			expect(store.getState().history).to.deep.eq({ undo: 0, redo: 0 });
		});
	});
});
