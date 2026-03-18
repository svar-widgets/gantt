import { describe, test, expect } from "vitest";
import { updateLink } from "../src/links";

describe("links", () => {
	test("link updating", () => {
		const link = { id: 1, source: 1, target: 2, type: "e2s" };
		const startTask = { $x: 100, $y: 3, $w: 300, $h: 31 };
		const endTask = { $x: 200, $y: 41, $w: 200, $h: 31 };

		const updatedLink = updateLink(
			link as any,
			startTask as any,
			endTask as any,
			38
		);

		expect(updatedLink.id).to.eq(1);
		expect(updatedLink.source).to.eq(1);
		expect(updatedLink.target).to.eq(2);
		expect(updatedLink.type).to.eq("e2s");
		expect(updatedLink.$p).to.eq(
			"400,18.5,420,18.5,420,37.5,180,37.5,180,56.5,200,56.5,195,53.5,195,59.5,200,56.5"
		);
	});
});
