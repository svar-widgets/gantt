import { assignChecks } from "./menuOptions";

export interface IButtonConfig {
	id?: string;
	comp: string;
	text?: string;
	icon?: string;
	type?: string;
	menuText?: string;

	check?: (params: any) => boolean;
}

export const defaultToolbarButtons: IButtonConfig[] =
	assignChecks<IButtonConfig>([
		{
			id: "add-task",
			comp: "button",
			icon: "wxi-plus",
			text: "New task",
			type: "primary",
		},
		{
			id: "edit-task",
			comp: "icon",
			icon: "wxi-edit",
			menuText: "Edit",
		},
		{
			id: "delete-task",
			comp: "icon",
			icon: "wxi-delete",
			menuText: "Delete",
		},
		{ comp: "separator" },
		{
			id: "move-task:up",
			comp: "icon",
			icon: "wxi-angle-up",
			menuText: "Move up",
		},
		{
			id: "move-task:down",
			comp: "icon",
			icon: "wxi-angle-down",
			menuText: "Move down",
		},
		{ comp: "separator" },
		{
			id: "copy-task",
			comp: "icon",
			icon: "wxi-content-copy",
			menuText: "Copy",
		},
		{
			id: "cut-task",
			comp: "icon",
			icon: "wxi-content-cut",
			menuText: "Cut",
		},
		{
			id: "paste-task",
			comp: "icon",
			icon: "wxi-content-paste",
			menuText: "Paste",
		},
		{ comp: "separator" },
		{
			id: "indent-task:add",
			comp: "icon",
			icon: "wxi-indent",
			menuText: "Indent",
		},
		{
			id: "indent-task:remove",
			comp: "icon",
			icon: "wxi-unindent",
			menuText: "Outdent",
		},
	]);
