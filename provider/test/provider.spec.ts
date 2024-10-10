import { describe, expect, it } from "vitest";
import { RestDataProvider } from "../src/index";

function getDataStore() {
	const provider = new RestDataProvider("");
	return { provider };
}

describe("data provider", () => {
	it("can be initialized", () => {
		const t = getDataStore();
		expect(t).to.not.eq(null);
	});
});
