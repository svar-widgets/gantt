import pkg from "../package.json" with { type: "json" };

import Gantt from "./components/Gantt.svelte";
import Toolbar from "./components/Toolbar.svelte";
import ContextMenu from "./components/ContextMenu.svelte";
import Editor from "./components/Editor.svelte";
import HeaderMenu from "./components/grid/HeaderMenu.svelte";
import ResourceLoad from "./components/resource/ResourceLoad.svelte";
import ConflictReport from "./components/conflicts/ConflictReport.svelte";

import Tooltip from "./widgets/Tooltip.svelte";

import Material from "./themes/Material.svelte";
import Willow from "./themes/Willow.svelte";
import WillowDark from "./themes/WillowDark.svelte";

export {
	defaultEditorItems,
	defaultToolbarButtons,
	defaultMenuOptions,
	defaultColumns,
	getDefaultColumns,
	getResourceColumns,
	defaultTaskTypes,
	getEditorItems,
	getEditorButtons,
	getToolbarButtons,
	getMenuOptions,
	registerScaleUnit,
} from "@svar-ui/gantt-store";

export { registerEditorItem } from "@svar-ui/svelte-editor";

export { locateTask } from "./helpers/dnd.js";

const version = pkg.version;

export {
	Gantt,
	ContextMenu,
	HeaderMenu,
	Toolbar,
	Tooltip,
	Editor,
	ResourceLoad,
	ConflictReport,
	Material,
	Willow,
	WillowDark,
	version,
};
