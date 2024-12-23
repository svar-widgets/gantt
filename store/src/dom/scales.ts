
export function grid(
	width: number,
	height: number,
	color: string,
	mode?: "full"
): string {
	// FIXME :: Svelte-kit
	if (typeof document === "undefined") return "";
	const canvas = document.createElement("canvas");

	let fillMode = true;

	if (fillMode) {
		const ctx = canvasSize(canvas, width, height, 1, color);
		renderCell(ctx, mode, 0, width, 0, height);
	}
	// #endif
	return canvas.toDataURL();
}

function canvasSize(
	canvas: HTMLCanvasElement,
	width: number,
	height: number,
	zoom: number,
	color: string
): CanvasRenderingContext2D {
	canvas.setAttribute("width", (width * zoom).toString());
	canvas.setAttribute("height", (height * zoom).toString());
	const ctx = canvas.getContext("2d");
	ctx.translate(-0.5, -0.5);
	ctx.strokeStyle = color;

	return ctx;
}

function renderCell(
	ctx: CanvasRenderingContext2D,
	mode: string,
	xA: number,
	xB: number,
	yA: number,
	yB: number
) {
	ctx.beginPath();
	ctx.moveTo(xB, yA);
	ctx.lineTo(xB, yB);

	if (mode === "full") ctx.lineTo(xA, yB);
	ctx.stroke();
}
