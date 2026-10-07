import { IConstraintType } from "./types";

export const defaultConstraintTypes: IConstraintType[] = [
	{ id: "snet", label: "Start no earlier than" },
	{ id: "snlt", label: "Start no later than" },
	{ id: "fnet", label: "Finish no earlier than" },
	{ id: "fnlt", label: "Finish no later than" },
	{ id: "mso", label: "Must start on" },
	{ id: "mfo", label: "Must finish on" },
];
