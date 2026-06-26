import { describe, test, expect } from "vitest";
import {
	normalizeColumns,
	defaultColumns,
	getDefaultColumns,
	getDefaultGridWidth,
} from "../src/columns";

describe("columns", () => {
	test("normalize column config", () => {
		const columns = normalizeColumns(defaultColumns);

		expect(columns.length).to.eq(4);

		for (const col of columns) {
			if (!col.flexgrow) expect(col.width).to.not.be.undefined;
			expect(col.align).to.not.be.undefined;
		}

		expect(normalizeColumns([])).to.deep.eq([]);
	});

	test("default grid width sums column widths", () => {
		// plain defaults: 183 + 120 + 100 + 37
		expect(getDefaultGridWidth(getDefaultColumns())).to.eq(440);

		// resources adds a column and widens text: 200 + 110 + 120 + 100 + 37
		expect(
			getDefaultGridWidth(getDefaultColumns({ resources: true }))
		).to.eq(567);

		// wbs prepends a column: 80 + 183 + 120 + 100 + 37
		expect(getDefaultGridWidth(getDefaultColumns({ wbs: true }))).to.eq(
			520
		);

		// both: 80 + 200 + 110 + 120 + 100 + 37
		expect(
			getDefaultGridWidth(
				getDefaultColumns({ resources: true, wbs: true })
			)
		).to.eq(647);
	});
});
