import LocalData from "./cases/LocalData.svelte";
import Base from "./cases/Base.svelte";
import CriticalPath from "./cases/CriticalPath.svelte";
import CrossingLinks from "./cases/CrossingLinks.svelte";
import AutoSchedule from "./cases/AutoSchedule.svelte";

export const links = [
	["/local-data", "", LocalData],
	["/base", "", Base],
	["/critical-path", "", CriticalPath],
	["/crossing-links", "", CrossingLinks],
	["/autoschedule", "", AutoSchedule],
];
