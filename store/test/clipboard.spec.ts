import { describe, test, expect } from "vitest";
import { getData } from "./stubs/data";
import { writable } from "./stubs/writable";
import { DataStore, normalizeLinks } from "../src/index";
import { handleAction } from "../src/helpers/actionHandlers";

const _ = (v: string) => v;

let store: any;

function resetState() {
	const data = getData("full");
	data.links = normalizeLinks(data.links);
	store = new DataStore(writable);
	store.init({ ...data, undo: true });
}

function trackExec() {
	const calls: { action: string; id: any }[] = [];
	const exec = store.in.exec;
	store.in.exec = (action: string, ev: any) => {
		calls.push({ action, id: ev?.id });
		return exec(action, ev);
	};
	return calls;
}

const branchOf = (id: number) =>
	store
		.getState()
		.tasks.byId(id)
		.data.map((t: any) => t.id);

describe("clipboard", () => {
	test("skips cut tasks that were deleted before the paste", () => {
		resetState();

		store.in.exec("select-task", { id: 110 });
		handleAction(store, "cut-task", null, _);

		// the editor deletes through the api, not through handleAction
		store.in.exec("delete-task", { id: 110 });

		store.in.exec("select-task", { id: 112 });
		const dispatched = trackExec();
		handleAction(store, "paste-task", null, _);

		expect(dispatched).to.deep.eq([]);
		expect(store._temp).to.eq(null);
		expect(branchOf(11)).to.deep.eq([111, 112, 113]);
		expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });
	});

	test("skips copied tasks that were deleted before the paste", () => {
		resetState();

		store.in.exec("select-task", { id: 110 });
		handleAction(store, "copy-task", null, _);

		store.in.exec("delete-task", { id: 110 });

		store.in.exec("select-task", { id: 112 });
		const dispatched = trackExec();
		handleAction(store, "paste-task", null, _);

		expect(dispatched).to.deep.eq([]);
		expect(store._temp).to.eq(null);
		expect(branchOf(11)).to.deep.eq([111, 112, 113]);
		expect(store.getState().history).to.deep.eq({ undo: 1, redo: 0 });
	});

	test("pastes the tasks that are still there", () => {
		resetState();

		store.in.exec("select-task", { id: 110 });
		store.in.exec("select-task", { id: 112, toggle: true });
		handleAction(store, "copy-task", null, _);

		store.in.exec("delete-task", { id: 110 });

		store.in.exec("select-task", { id: 113 });
		const dispatched = trackExec();
		handleAction(store, "paste-task", null, _);

		expect(dispatched.map(d => d.id)).not.to.include(110);
		expect(dispatched[0].action).to.eq("copy-task");
		expect(dispatched[0].id).to.eq(112);

		const branch = branchOf(11);
		expect(branch.slice(0, 3)).to.deep.eq([111, 112, 113]);
		expect(branch.length).to.eq(4);
		expect(store.getState().tasks.byId(branch[3]).text).to.eq(
			store.getState().tasks.byId(112).text
		);
		expect(store._temp).to.eq(null);
	});

	test("does not duplicate children when parent and children are copied", () => {
		resetState();

		store.in.exec("select-task", { id: 11 }); // parent
		store.in.exec("select-task", { id: 110, toggle: true }); // child 1
		store.in.exec("select-task", { id: 112, toggle: true }); // child 2
		handleAction(store, "copy-task", null, _);

		// expect the parent only to be copied, not the children
		expect(store._temp).to.deep.eq([{ id: 11, cut: false }]);

		store.in.exec("select-task", { id: 12 });
		handleAction(store, "paste-task", null, _);

		expect(branchOf(1)).to.have.length(4);
		expect(branchOf(branchOf(1)[3])).to.have.length(4);
	});
});
