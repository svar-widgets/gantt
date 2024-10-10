// vite.config.ts
import { resolve } from "path";
import { defineConfig, loadEnv } from "vite";
import dts from "vite-plugin-dts";
import { waitChanges, waitOn } from "wx-vite-tools";

export default async ({ mode }) => {
	process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

	const files =
		mode === "production"
			? []
			: [resolve(__dirname, "../store/dist/index.js")];

	const config = {
		build: {
			lib: {
				entry: resolve(__dirname, "src/index.ts"),
				name: "provider",
				formats: ["es"],
				fileName: () => `index.js`,
			},
			sourcemap: true,
			minify: false,
			target: "esnext",
		},
		test: {
			coverage: {
				reporter: ["text"],
			},
		},
		watch: {
			persistent: true,
			include: ["src/**/*.ts", "src/**/*.js"],
		},
		plugins: [
			waitChanges({ files }),
			dts({ outDir: resolve(__dirname, "dist/types") }),
		],
	};

	return waitOn({ files }).then(() => defineConfig(config));
};
