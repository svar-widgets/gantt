// vite.config.ts
import { resolve } from "path";
import { existsSync, writeFileSync } from "fs";
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
	const open = process.env.WX_PACKAGE_TYPE == "open";
	const isProduction = mode !== "development" && mode !== "test";

	const proSchedule = resolve(__dirname, "src/pro/schedule-types.ts");
	const usePro = !open && existsSync(proSchedule);

	const config = {
		resolve: {
			alias: usePro
				? [
						{
							find: /^(.*\/)?schedule-types$/,
							replacement: proSchedule,
						},
					]
				: [],
		},
		build: {
			lib: {
				entry: resolve(__dirname, "src/index.ts"),
				name: "store",
				formats: ["es"],
				fileName: () => `index.js`,
			},
			sourcemap: !trial,
			minify: isProduction,
			target: "esnext",
		},
		test: {
			coverage: {
				reporter: ["text"],
			},
		},
		plugins: [],
	};

	if (isProduction) {
		config.plugins.push(conditionalCompile({}));
	}

	if (usePro) {
		config.plugins.push(
			dts({
				outDir: resolve(__dirname, "dist/types"),
				afterBuild: () => {
					writeFileSync(
						resolve(__dirname, "dist/types/schedule-types.d.ts"),
						'export * from "./pro/schedule-types";\n'
					);
				},
			})
		);
	} else {
		config.plugins.push(
			dts({
				outDir: resolve(__dirname, "dist/types"),
				exclude: ["src/pro/**"],
			})
		);
	}

	if (isProduction) {
		config.plugins.push(minify);
	}

	return defineConfig(config);
}
