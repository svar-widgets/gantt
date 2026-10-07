import { describe, test, expect } from "vitest";
import { clamp } from "../src/helpers/data";

describe("math helpers", () => {
	test("clamp keeps value inside the range", () => {
		expect(clamp(5, 0, 10)).to.eq(5);
		expect(clamp(-5, 0, 10)).to.eq(0);
		expect(clamp(15, 0, 10)).to.eq(10);
	});

	test("clamp prefers the lower bound when the range is inverted", () => {
		expect(clamp(5, 0, -10)).to.eq(0);
		expect(clamp(-20, 0, -10)).to.eq(0);
		expect(clamp(-10, 0, -10)).to.eq(0);
	});

	test("clamp works with dates", () => {
		const lower = new Date(2024, 3, 1);
		const upper = new Date(2024, 3, 10);

		expect(clamp(new Date(2024, 3, 5), lower, upper)).to.deep.eq(
			new Date(2024, 3, 5)
		);
		expect(clamp(new Date(2024, 2, 20), lower, upper)).to.deep.eq(lower);
		expect(clamp(new Date(2024, 3, 20), lower, upper)).to.deep.eq(upper);
		expect(
			clamp(new Date(2024, 3, 5), lower, new Date(2024, 2, 1))
		).to.deep.eq(lower);
	});
});
