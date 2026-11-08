import type { ParsedStack, TestError } from "vite-plus/test";
import { defineConfig } from "vite-plus";

export default defineConfig({
	pack: {
		dts: {
			generator: "tsgo",
		},
		exports: true,
	},
	lint: {
		options: {
			typeAware: true,
			typeCheck: true,
		},
	},
	fmt: {},
	test: {
		onStackTrace(error: TestError, { file }: ParsedStack): boolean | void {
			if (file.includes("node_modules")) {
				return false;
			}
		},
	},
});
