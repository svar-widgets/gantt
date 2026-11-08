import type { ParsedStack, TestError } from "vite-plus/test";
import { defineConfig, loadEnv } from "vite-plus";
import { stripBlocks } from "../../.vite-plugins/strip-blocks.js";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const isTrial = env.VITE_SVAR_PACKAGE === "trial";

	return {
		pack: {
			dts: {
				generator: "tsgo",
				tsconfig: "tsconfig.build.json",
			},
			exports: true,
			minify: isTrial,
			plugins: [
				stripBlocks({ strip: env.VITE_SVAR_PACKAGE === "mit" }),
				stripBlocks({
					strip: !isTrial,
					startMarker: "//<trial>",
					endMarker: "//</trial>",
				}),
			],
		},
		lint: {
			options: {
				typeAware: true,
				typeCheck: true,
			},
		},
		fmt: {},
		test: {
			onStackTrace(
				error: TestError,
				{ file }: ParsedStack
			): boolean | void {
				if (file.includes("node_modules")) {
					return false;
				}
			},
		},
	};
});
