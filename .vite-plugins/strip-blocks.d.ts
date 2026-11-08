import type { Plugin } from "vite-plus";

export interface StripBlocksOptions {
	/** remove the marked blocks; when false the plugin does nothing */
	strip?: boolean;
	startMarker?: string;
	endMarker?: string;
}

export function stripBlocks(options?: StripBlocksOptions): Plugin;
