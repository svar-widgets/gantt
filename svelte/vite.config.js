import { loadEnv } from "vite";
import { resolve } from "path";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { visualizer } from "rollup-plugin-visualizer";
import { waitChanges, waitOn } from "wx-vite-tools";
import conditionalCompile from "vite-plugin-conditional-compile";
import pkg from "./package.json";

export default async ({ mode }) => {
	process.env = { ...process.env, ...loadEnv(mode, process.cwd(), "WX") };

	const files =
		mode === "production"
			? []
			: [
					resolve(__dirname, "../store/dist/index.js"),
					resolve(__dirname, "../provider/dist/index.js"),
				];

	const plugins = [waitChanges({ files })];
	if (mode !== "development") plugins.push(conditionalCompile());
	plugins.push(svelte({}));

	let build,
		publicDir = resolve(__dirname, "public"),
		server = {},
		base = "";

	if (mode === "test") {
		build = {
			rollupOptions: {
				input: { tests: resolve(__dirname, "tests/index.html") },
			},
		};
		server.port = 5000;
	} else {
		build = {
			rollupOptions: {
				input: { index: resolve(__dirname, "index.html") },
			},
		};
	}

	if (process.env.WX_BUILD_STATS) {
		build = {
			lib: {
				entry: resolve(__dirname, "src/index.js"),
				name: pkg.productTag,
				formats: ["es"],
				fileName: format => `${pkg.productTag}.${format}.js`,
			},
			outDir: "./dist",
			sourcemap: true,
			minify: true,
			target: "esnext",
		};
		publicDir = false;
		plugins.push(visualizer({ filename: "dist/stats.html" }));
	}

	await waitOn({ files });

	return {
		base,
		build,
		publicDir,
		resolve: { dedupe: ["svelte"] },
		plugins,
		server,
		watch: {
			persistent: true,
			include: ["src/**/*.ts", "src/**/*.js"],
		},
	};
};
