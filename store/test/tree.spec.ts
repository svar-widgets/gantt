import { expect, test, describe } from "vitest";
import GanttDataTree from "../src/GanttDataTree";

function getTree() {
	return new GanttDataTree([
		{ id: 1, text: "1.0" },
		{ id: 2, text: "2.0" },
		{ id: 3, text: "3.0" },
		{ id: 21, text: "2.1", parent: 2 },
		{ id: 22, text: "2.2", parent: 2 },
		{ id: 23, text: "2.3", parent: 2 },
	]);
}

const ids = (branch: { id: unknown }[]) => branch.map(a => a.id);

describe("GanttDataTree.update", () => {
	test("writes to the addressed task only", () => {
		const t = getTree();
		t.update(22, { text: "updated" });

		expect(t.byId(22).text).to.equal("updated");
		expect(ids(t.getBranch(22))).to.deep.equal([21, 22, 23]);
		expect(t.byId(21).text).to.equal("2.1");
		expect(t.byId(23).text).to.equal("2.3");
	});

	test("writes the sibling array in place, leaves other branches alone", () => {
		const t = getTree();
		const branch = t.byId(2).data;
		const top = t.byId(0).data;

		t.update(21, { text: "2.1.1" });
		expect(t.byId(2).data === branch, "sibling array").toBeTruthy();
		expect(t.byId(0).data === top, "other branch").toBeTruthy();
		expect(branch[0].text).to.equal("2.1.1");
	});

	test("stays correct across the whole branch", () => {
		const t = getTree();
		[21, 22, 23].forEach(id => t.update(id, { text: `t${id}` }));

		expect(ids(t.getBranch(21))).to.deep.equal([21, 22, 23]);
		expect(t.byId(2).data.map(a => a.text)).to.deep.equal([
			"t21",
			"t22",
			"t23",
		]);
	});

	// the cached positions are keyed by the sibling array, so anything that
	// reorders or extends that array in place has to be caught
	test("survives an in-place sort of the branch", () => {
		const t = getTree();
		t.update(21, { text: "a" });

		t.sort([{ key: "text", order: "desc" }], []);
		expect(ids(t.getBranch(21))).to.deep.equal([21, 23, 22]);

		t.update(21, { text: "moved" });
		expect(t.byId(21).text).to.equal("moved");
		expect(t.byId(23).text).to.equal("2.3");
		expect(ids(t.getBranch(21))).to.deep.equal([21, 23, 22]);
	});

	test("survives a direct push into the branch", () => {
		const t = getTree();
		t.update(21, { text: "a" });

		const extra = { id: 24, text: "2.4", parent: 2, $level: 2 };
		t.byId(2).data.push(extra);
		t._pool.set(24, extra);

		t.update(24, { text: "pushed" });
		expect(t.byId(24).text).to.equal("pushed");
		expect(t.byId(23).text).to.equal("2.3");
	});

	// one task dropped and another appended leaves the branch at the width the
	// cache was built for, so the size check passes on a map that is wrong for
	// every position after the removal
	test("survives a branch that loses and regains its width", () => {
		const t = getTree();
		t.update(23, { text: "t23" });

		const data = t.byId(2).data;
		data.splice(1, 1);
		const extra = { id: 24, text: "2.4", parent: 2, $level: 2 };
		data.push(extra);
		t._pool.set(24, extra);
		expect(ids(t.getBranch(21))).to.deep.equal([21, 23, 24]);

		t.update(23, { text: "moved up" });

		expect(t.byId(23).text).to.equal("moved up");
		expect(t.byId(24).text).to.equal("2.4");
		expect(t.getIndexById(23)).to.equal(1);
	});

	test("stays correct after add, move and remove", () => {
		const t = getTree();
		t.update(22, { text: "a" });

		t.add({ id: 24, text: "2.4", parent: 2 }, 0);
		t.update(22, { text: "b" });
		expect(t.byId(22).text).to.equal("b");
		expect(t.byId(24).text).to.equal("2.4");

		t.move(23, "before", 24);
		t.update(23, { text: "c" });
		expect(t.byId(23).text).to.equal("c");
		expect(t.byId(24).text).to.equal("2.4");

		t.remove(24);
		t.update(21, { text: "d" });
		expect(t.byId(21).text).to.equal("d");
		expect(ids(t.getBranch(21))).to.deep.equal([23, 21, 22]);
	});

	test("getIndexById follows the branch order", () => {
		const t = getTree();
		expect(t.getIndexById(22)).to.equal(1);

		t.sort([{ key: "text", order: "desc" }], []);
		expect(t.getIndexById(22)).to.equal(1);
		expect(t.getIndexById(23)).to.equal(0);
		expect(t.getIndexById(21)).to.equal(2);
	});
});
