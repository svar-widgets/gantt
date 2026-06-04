import { describe, test, expect } from "vitest";
import GanttDataTree from "../src/GanttDataTree";
import { calculateWbs } from "../src/pro/wbs";
import type { ITask } from "../src/types";

function task(id: number, parent: number, type = "task"): Partial<ITask> {
	return {
		id,
		text: `Task ${id}`,
		type: type as ITask["type"],
		parent,
		start: new Date(2024, 3, 1),
		end: new Date(2024, 3, 5),
	};
}

describe("calculateWbs", () => {
	test("assigns sequential codes to flat root tasks", () => {
		const tree = new GanttDataTree([task(1, 0), task(2, 0), task(3, 0)]);

		calculateWbs(tree);

		expect(tree.byId(1).$wbs).toBe("1");
		expect(tree.byId(2).$wbs).toBe("2");
		expect(tree.byId(3).$wbs).toBe("3");
	});

	test("assigns dotted codes to nested tasks", () => {
		const tree = new GanttDataTree([
			task(1, 0, "summary"),
			task(2, 1),
			task(3, 1, "summary"),
			task(4, 3),
		]);

		calculateWbs(tree);

		expect(tree.byId(1).$wbs).toBe("1");
		expect(tree.byId(2).$wbs).toBe("1.1");
		expect(tree.byId(3).$wbs).toBe("1.2");
		expect(tree.byId(4).$wbs).toBe("1.2.1");
	});

	test("codes are based on sibling position, not task id", () => {
		const tree = new GanttDataTree([task(100, 0), task(5, 0)]);

		calculateWbs(tree);

		expect(tree.byId(100).$wbs).toBe("1");
		expect(tree.byId(5).$wbs).toBe("2");
	});

	test("handles multiple roots with children", () => {
		const tree = new GanttDataTree([
			task(1, 0, "summary"),
			task(2, 1),
			task(3, 0, "summary"),
			task(4, 3),
			task(5, 3),
		]);

		calculateWbs(tree);

		expect(tree.byId(1).$wbs).toBe("1");
		expect(tree.byId(2).$wbs).toBe("1.1");
		expect(tree.byId(3).$wbs).toBe("2");
		expect(tree.byId(4).$wbs).toBe("2.1");
		expect(tree.byId(5).$wbs).toBe("2.2");
	});

	test("handles deeply nested hierarchy", () => {
		const tree = new GanttDataTree([
			task(1, 0, "summary"),
			task(2, 1, "summary"),
			task(3, 2, "summary"),
			task(4, 3),
		]);

		calculateWbs(tree);

		expect(tree.byId(1).$wbs).toBe("1");
		expect(tree.byId(2).$wbs).toBe("1.1");
		expect(tree.byId(3).$wbs).toBe("1.1.1");
		expect(tree.byId(4).$wbs).toBe("1.1.1.1");
	});

	test("updates codes after re-run on reordered siblings", () => {
		const tree = new GanttDataTree([task(1, 0), task(2, 0)]);

		calculateWbs(tree);
		expect(tree.byId(1).$wbs).toBe("1");
		expect(tree.byId(2).$wbs).toBe("2");

		// Swap sibling order directly
		const root = tree.byId(0);
		[root.data![0], root.data![1]] = [root.data![1], root.data![0]];

		calculateWbs(tree);
		expect(tree.byId(2).$wbs).toBe("1");
		expect(tree.byId(1).$wbs).toBe("2");
	});
});
