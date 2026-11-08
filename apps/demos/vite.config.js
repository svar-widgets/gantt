import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, loadEnv } from "vite-plus";
import { stripBlocks } from "../../.vite-plugins/strip-blocks.js";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");

	return {
		base: "./",
		plugins: [
			stripBlocks({ strip: env.VITE_SVAR_PACKAGE === "mit" }),
			svelte(),
		],
		resolve: {
			dedupe: ["svelte"],
		},
		server: {
			port: 3103,
			host: "0.0.0.0",
		},
	};
});
