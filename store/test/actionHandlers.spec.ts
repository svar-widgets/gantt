import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { getData } from "./stubs/data";
import { writable } from "./stubs/writable";
import { DataStore, normalizeLinks } from "../src/index";
import { handleAction } from "../src/helpers/actionHandlers";

const _ = (v: string) => v;

let store: DataStore;

function resetState() {
	const data = getData("full");
	data.links = normalizeLinks(data.links);
	store = new DataStore(writable);
	store.init({ ...data, undo: true });
}

function select(...ids: number[]) {
	ids.forEach((id, i) => {
		store.in.exec("select-task", { id, toggle: !!i });
	});
}

function calledIds(action: string) {
	return store.in.exec.mock.calls
		.filter(([name]) => name === action)
		.map(([, data]) => data.id);
}

function delay() {
	vi.advanceTimersByTime(1);
}

describe("actionHandlers", () => {
	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		resetState();
		vi.spyOn(store.in, "exec");
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("parent and children", () => {
		test("does not delete children when parent and children are selected", () => {
			select(2, 20, 21);

			handleAction(store, "delete-task", null, _);
			delay();

			expect(calledIds("delete-task")).to.deep.eq([2]);

			const { tasks } = store.getState();
			expect(tasks.byId(2)).to.be.undefined;
			expect(tasks.byId(20)).to.be.undefined;
			expect(tasks.byId(21)).to.be.undefined;
			expect(tasks.toArray().length).to.eq(14);
		});

		test("does not move children up when parent and children are selected", () => {
			select(11, 110, 112);

			handleAction(store, "move-task:up", null, _);
			delay();

			expect(calledIds("move-task")).to.deep.eq([11]);
		});

		test("does not move children down when parent and children are selected", () => {
			select(11, 110, 112);

			handleAction(store, "move-task:down", null, _);
			delay();

			expect(calledIds("move-task")).to.deep.eq([11]);
		});

		test("does not indent children when parent and children are selected", () => {
			select(11, 110, 112);

			handleAction(store, "indent-task:add", null, _);
			delay();

			expect(calledIds("indent-task")).to.deep.eq([11]);
		});
	});
});
