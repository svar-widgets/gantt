import Gantt from "./components/Gantt.svelte";
import Toolbar from "./components/Toolbar.svelte";
import ContextMenu from "./components/ContextMenu.svelte";
import Editor from "./components/Editor.svelte";
import HeaderMenu from "./components/grid/HeaderMenu.svelte";

import Tooltip from "./widgets/Tooltip.svelte";

import Material from "./themes/Material.svelte";
import Willow from "./themes/Willow.svelte";
import WillowDark from "./themes/WillowDark.svelte";

export {
	defaultEditorItems,
	defaultToolbarButtons,
	defaultMenuOptions,
	defaultColumns,
	defaultTaskTypes,
	getEditorItems,
	getToolbarButtons,
	getMenuOptions,
	registerScaleUnit,
} from "@svar-ui/gantt-store";

export { registerEditorItem } from "@svar-ui/svelte-editor";

const version = __APP_VERSION__;

export {
	Gantt,
	ContextMenu,
	HeaderMenu,
	Toolbar,
	Tooltip,
	Editor,
	Material,
	Willow,
	WillowDark,
	version,
};
