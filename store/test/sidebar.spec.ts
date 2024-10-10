import { describe, test, expect } from "vitest";
import { normalizeEditor } from "../src/sidebar";
import { taskTypes } from "./stubs/data";

describe("sidebar", () => {
	test("normalize editor config", () => {
		const editorShape = normalizeEditor({ taskTypes }); // assign IDs to fields and set options for available task types

		for (const field of editorShape) {
			expect(field.id).to.not.be.undefined;
			if (field.type === "select" && field.key === "type")
				expect(field.options).to.deep.eq(taskTypes);
		}
	});
});
