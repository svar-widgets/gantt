import LocalData from "./cases/LocalData.svelte";
import Base from "./cases/Base.svelte";
import CriticalPath from "./cases/CriticalPath.svelte";
import CrossingLinks from "./cases/CrossingLinks.svelte";

export const links = [
	["/local-data", "", LocalData],
	["/base", "", Base],
	["/critical-path", "", CriticalPath],
	["/crossing-links", "", CrossingLinks],
];
