import { dateToString } from "@wx/lib-dom";

export function getUnitFormats(_) {
	return {
		year: "%Y",
		quarter: `${_("Q")} %Q`,
		month: "%M",
		week: `${_("Week")} %w`,
		day: "%M %j",
		hour: "%H:%i",
	};
}

function normalizeFormatter(value, calendarLocale) {
	return typeof value === "function"
		? value
		: dateToString(value, calendarLocale);
}

export function prepareScales(scales, calendarLocale) {
	return scales.map(({ format, ...scale }) => ({
		...scale,
		format: normalizeFormatter(format, calendarLocale),
	}));
}

export function prepareFormats(calendarLocale, _) {
	const formats = getUnitFormats(_);
	for (let unit in formats) {
		formats[unit] = dateToString(formats[unit], calendarLocale);
	}
	return formats;
}

export function prepareColumns(columns, calendarLocale) {
	if (!columns || !columns.length) return columns;
	const format = dateToString("%d-%m-%Y", calendarLocale);

	return columns.map(col => {
		if (col.template) return col;

		if (col.id === "start" || col.id == "end") {
			return {
				...col,
				//store locale template for unscheduled tasks
				_template: b => format(b),
				template: b => format(b),
			};
		}
		if (col.id === "duration") {
			return {
				...col,
				_template: b => b,
				template: b => b,
			};
		}
		return col;
	});
}

export function prepareZoom(zoom, calendarLocale) {
	if (!zoom.levels) {
		return zoom;
	}

	return {
		...zoom,
		levels: zoom.levels.map(level => ({
			...level,
			scales: prepareScales(level.scales, calendarLocale),
		})),
	};
}
