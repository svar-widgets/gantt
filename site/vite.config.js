import { resolve } from "path";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import pkg from "./package.json" with { type: "json" };

export default () => {
	let build,
		publicDir = resolve(__dirname, "public"),
		server = {},
		base = "",
		plugins = [svelte({})];

	build = {
		rollupOptions: {
			input: { index: resolve(__dirname, "index.html") },
		},
	};

	return {
		define: {
			__APP_VERSION__: JSON.stringify(pkg.version),
		},
		base,
		build,
		publicDir,
		resolve: { dedupe: ["svelte"] },
		plugins,
		server,
	};
};
