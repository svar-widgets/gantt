import { describe, test, expect } from "vitest";
import { getData } from "./stubs/data";
import { writable } from "./stubs/writable";
import { DataStore, parseTaskDates } from "../src/index";
import { IParsedTask, TID } from "../src/types";

let store: DataStore;

function resetState(data?: any) {
	if (!data) data = getData();
	parseTaskDates(data.tasks, "day");
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

		test("can undo/redo after moving tasks (summary tasks)", () => {
			const initData = getData("summaries");
			resetState({
				...initData,
				undo: true,
			});

			const { tasks } = store.getState();

			store.in.exec("move-task", { id: 6, target: 5, mode: "before" });
			store.in.exec("move-task", { id: 4, target: 14, mode: "child" });

			store.in.exec("undo");
			expect(tasks.getBranch(6)?.map(t => t.id)).to.deep.equal([
				6, 5, 12, 13,
			]);
			expect(tasks.getBranch(2)?.map(t => t.id)).to.deep.equal([2]);
			expect(tasks.byId(11).duration).to.eq(6);
			expect(tasks.getBranch(15)?.map(t => t.id)).to.deep.equal([
				15, 16, 17,
			]);
			expect(tasks.byId(14).duration).to.eq(7);

			store.in.exec("undo");
			expect(tasks.getBranch(6)?.map(t => t.id)).to.deep.equal([2, 6]);
			expect(tasks.getBranch(5)?.map(t => t.id)).to.deep.equal([
				5, 12, 13,
			]);
			expect(tasks.getBranch(15)?.map(t => t.id)).to.deep.equal([
				15, 16, 17,
			]);
			expect(tasks.byId(14).duration).to.eq(7);

			store.in.exec("redo");
			expect(tasks.getBranch(6)?.map(t => t.id)).to.deep.equal([
				6, 5, 12, 13,
			]);
			expect(tasks.getBranch(2)?.map(t => t.id)).to.deep.equal([2]);
			expect(tasks.byId(11).duration).to.eq(6);
			expect(tasks.getBranch(15)?.map(t => t.id)).to.deep.equal([
				15, 16, 17,
			]);
			expect(tasks.byId(14).duration).to.eq(7);

			store.in.exec("redo");
			expect(tasks.getBranch(6)?.map(t => t.id)).to.deep.equal([
				6, 5, 12, 13,
			]);
			expect(tasks.byId(11).duration).to.eq(6);
			expect(tasks.getBranch(4)?.map(t => t.id)).to.deep.equal([
				15, 16, 17, 4,
			]);
			expect(tasks.getBranch(10)?.map(t => t.id)).to.deep.equal([10, 11]);
			expect(tasks.byId(14).duration).to.eq(8);
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
				expect(tasks.byId(14).duration).to.eq(6);
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
});
