// vite.config.ts
import { resolve } from "path";
import { defineConfig, loadEnv } from "vite";
import dts from "vite-plugin-dts";
import conditionalCompile from "vite-plugin-conditional-compile";
import esbuild from "esbuild";

const minify = {
	name: "minify",
	closeBundle: () => {
		esbuild.buildSync({
			entryPoints: ["./dist/index.js"],
			minify: true,
			allowOverwrite: true,
			outfile: "./dist/index.js",
		});
	},
};

export default function ({ mode }) {
	process.env = { ...process.env, ...loadEnv(mode, process.cwd(), "WX") };
	const trial = !!process.env.WX_TRIAL_PACKAGE;

	const config = {
		build: {
			lib: {
				entry: resolve(__dirname, "src/index.ts"),
				name: "store",
				formats: ["es"],
				fileName: () => `index.js`,
			},
			sourcemap: !trial,
			minify: mode !== "development",
			target: "esnext",
		},
		test: {
			coverage: {
				reporter: ["text"],
			},
		},
		plugins: [],
	};

	if (mode !== "development") {
		config.plugins.push(conditionalCompile({}));
	}

	if (!trial) {
		config.plugins.push(dts({ outDir: resolve(__dirname, "dist/types") }));
	} else {
		config.plugins.push(dts({ outDir: resolve(__dirname, "dist/types") }));
	}
	if (mode !== "development") {
		config.plugins.push(minify);
	}

	return defineConfig(config);
}
