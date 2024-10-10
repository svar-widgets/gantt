import { describe, test, expect } from "vitest";
import { updateLink } from "../src/links";

describe("links", () => {
	test("link updating", () => {
		const link = { id: 1, source: 1, target: 2, type: "e2s" };
		const startTask = { $x: 100, $y: 3, $w: 300 };
		const endTask = { $x: 200, $y: 41, $w: 200 };

		const updatedLink = updateLink(
			link as any,
			startTask as any,
			endTask as any,
			38,
			false
		);

		expect(updatedLink.id).to.eq(1);
		expect(updatedLink.source).to.eq(1);
		expect(updatedLink.target).to.eq(2);
		expect(updatedLink.type).to.eq("e2s");
		expect(updatedLink.$p).to.eq(
			"400,19,420,19,420,38,180,38,180,57,200,57,195,54,195,60,200,57"
		);
	});
});
