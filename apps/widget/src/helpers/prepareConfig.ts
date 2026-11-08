import { dateToString } from "@svar-ui/lib-dom";
import type {
	IGanttColumn,
	IScaleConfig,
	IUnitFormats,
	IZoomConfig,
} from "@svar-ui/gantt-store";

type TCalendarLocale = Parameters<typeof dateToString>[1];
type TTranslate = (text: string) => string;

export type TPreparedScale = Omit<IScaleConfig, "format"> & {
	format: (date: Date, next?: Date) => string;
};

export function getUnitFormats(_: TTranslate): IUnitFormats {
	return {
		year: "%Y",
		quarter: `${_("Q")} %Q`,
		month: "%M",
		week: `${_("Week")} %w`,
		day: "%M %j",
		hour: "%H:%i",
	};
}

function normalizeFormatter(
	value: IScaleConfig["format"],
	calendarLocale: TCalendarLocale
) {
	return typeof value === "function"
		? value
		: dateToString(value!, calendarLocale);
}

export function prepareScales(
	scales: IScaleConfig[],
	calendarLocale: TCalendarLocale
): TPreparedScale[] {
	return scales.map(({ format, ...scale }) => ({
		...scale,
		format: normalizeFormatter(format, calendarLocale),
	}));
}

export function prepareFormats(
	calendarLocale: TCalendarLocale,
	_: TTranslate
): IUnitFormats {
	const formats = getUnitFormats(_);
	for (let unit in formats) {
		formats[unit] = dateToString(formats[unit] as string, calendarLocale);
	}
	return formats;
}

export function prepareColumns<T extends Pick<IGanttColumn, "id" | "template">>(
	columns: T[] | null | undefined,
	calendarLocale: TCalendarLocale
) {
	if (!columns || !columns.length) return columns;
	const format = dateToString("%d-%m-%Y", calendarLocale);

	return columns.map(col => {
		if (col.template) return col;

		if (col.id === "start" || col.id === "end") {
			return {
				...col,
				//store locale template for unscheduled tasks
				_template: (b: Date) => format(b),
				template: (b: Date) => format(b),
			};
		}
		if (col.id === "duration") {
			return {
				...col,
				_template: (b: any) => b,
				template: (b: any) => b,
			};
		}
		return col;
	});
}

export function prepareZoom(
	zoom: boolean | IZoomConfig,
	calendarLocale: TCalendarLocale
) {
	const config = zoom as IZoomConfig;
	if (!config.levels) {
		return zoom;
	}

	return {
		...config,
		levels: config.levels.map(level => ({
			...level,
			scales: prepareScales(level.scales, calendarLocale),
		})),
	};
}
