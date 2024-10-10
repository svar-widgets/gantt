import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
	"./site/vite.config.js",
	"./store/vite.config.js",
	"./svelte/vite.config.js",
	"./provider/vite.config.js",
]);
