import { describe, test, expect } from "vitest";
import { normalizeColumns, defaultColumns } from "../src/columns";

describe("columns", () => {
	test("normalize column config", () => {
		const columns = normalizeColumns(defaultColumns);

		expect(columns.length).to.eq(4);

		for (const col of columns) {
			expect(col.width).to.not.be.undefined;
			expect(col.align).to.not.be.undefined;
			if (col.id === "start" || col.id === "end")
				expect(col.template).to.not.be.undefined;
			if (col.id === "action") expect(col.action).to.not.be.undefined;
			else {
				expect(col.resize).to.be.true;
				expect(col.sort).to.be.true;
			}
		}

		expect(normalizeColumns([])).to.deep.eq([]);
	});
});
