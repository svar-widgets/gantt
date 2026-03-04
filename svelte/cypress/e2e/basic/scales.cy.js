const scroll = (zoom, delta = 120) => {
	cy.get(".wx-chart").trigger("wheel", {
		deltaY: zoom === "zoom-in" ? -delta : delta,
		ctrlKey: true,
	});
};

const delay = 120; // ms between wheel turns
const maxLevel = 5;
const minLevel = 1;
function expectedWidthAndLevel(width, level, factor, min, max) {
	const nwidth = Math.round(width * factor);
	if (nwidth > max) {
		if (level < maxLevel) {
			level++;
			width = min;
		} else width = max;
	} else if (nwidth < min) {
		if (level > minLevel) {
			width = max;
			level--;
		} else width = min;
	} else {
		width = nwidth;
	}
	return { width, level };
}

const levelHeaders = {
	5: "Apr 1",
	4: "April 2026",
	3: "Mar",
	2: "Quarter 1",
	1: "2026",
};

const zoomSteps = 32;
function performZooming(factor, cwidth = 100, level = 4, step = 0) {
	if (step >= zoomSteps) return;

	cy.log(`Zoom step ${step + 1}`);

	cy.then(() => scroll(factor > 1 ? "zoom-in" : "zoom-out"));
	cy.wait(delay);

	const expected = expectedWidthAndLevel(cwidth, level, factor, 50, 300);

	cy.log("expected level", expected.level);

	cy.get(".wx-scale .wx-row:last-child > :first-child")
		.invoke("width")
		.then(width => {
			cy.log("expected width", expected.width, "actual width", width);
			expect(Math.abs(expected.width - width)).to.be.lte(1);

			cy.get("@topRowScale").should(
				"contain",
				levelHeaders[expected.level]
			);

			performZooming(factor, width, expected.level, step + 1);
		});
}

context("Scale zoom works", () => {
	it("zoom in ok", () => {
		cy.visit("/index.html#/zoom/willow");
		cy.viewport(1300, 900);
		cy.wait(500);

		cy.get(".wx-scale .wx-row").first().as("topRowScale");

		const factor = 1.16; // getZoomFactor(-120); // 120 is the current mouse delta on the device it was tested, so we emulate it
		performZooming(factor);

		cy.shot("zoom-in works");
	});

	it("zoom out ok", () => {
		cy.visit("/index.html#/zoom/willow");
		cy.viewport(1300, 900);
		cy.wait(500);

		cy.get(".wx-scale .wx-row").first().as("topRowScale");

		const factor = 0.86; // getZoomFactor(120); // -120 is the current mouse delta on the device it was tested, so we emulate it
		performZooming(factor);

		cy.shot("zoom-out works");
	});
});
