import { describe, test, expect } from "vitest";
import { normalizeColumns, defaultColumns } from "../src/columns";

describe("columns", () => {
	test("normalize column config", () => {
		const columns = normalizeColumns(defaultColumns);

		expect(columns.length).to.eq(4);

		for (const col of columns) {
			expect(col.width).to.not.be.undefined;
			expect(col.align).to.not.be.undefined;
		}

		expect(normalizeColumns([])).to.deep.eq([]);
	});
});
