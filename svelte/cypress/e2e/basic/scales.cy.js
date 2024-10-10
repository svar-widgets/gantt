context("Scale", () => {
	it("scale works with local data", () => {
		cy.visit("/index.html#/zoom/willow");
		cy.viewport(1300, 900);

		let cellWidth = 100;
		const zoomSteps = 6;
		const zoomDelta = 50; // each zoom step is 50px
		const initialZoomStep = cellWidth / zoomDelta; // get initial zoom step
		const minCellWidth = 50;
		const maxCellWidth = 300;

		const scroll = zoom => {
			cy.get(".wx-chart").trigger("wheel", {
				deltaY: zoom === "zoom-in" ? -100 : 100,
				ctrlKey: true,
			});
		};
		cy.get(".wx-scale .wx-row").first().as("topRowScale");
		cy.get(".wx-scale .wx-row:last-child > :first-child").should(
			"have.css",
			"width",
			`${cellWidth}px`
		);

		for (let i = initialZoomStep; i <= zoomSteps; i++) {
			cellWidth =
				cellWidth + zoomDelta > maxCellWidth
					? minCellWidth
					: cellWidth + zoomDelta;

			scroll("zoom-in");
			cy.get(".wx-scale .wx-row:last-child > :first-child").should(
				"have.css",
				"width",
				`${cellWidth}px`
			);

			i < zoomSteps
				? cy.get("@topRowScale").should("contain", "April 2024")
				: cy.get("@topRowScale").should("contain", "Apr 6");
		}

		cy.shot("zoom-in works");

		cy.get("@topRowScale").should("contain", "Apr 6");
		for (let i = initialZoomStep; i <= zoomSteps; i++) {
			cellWidth =
				cellWidth - zoomDelta < minCellWidth
					? maxCellWidth
					: cellWidth - zoomDelta;

			scroll("zoom-out");
			cy.get(".wx-scale .wx-row:last-child > :first-child").should(
				"have.css",
				"width",
				`${cellWidth}px`
			);

			cy.get("@topRowScale").should("contain", "April 2024");
		}

		cy.shot("zoom-out works");
	});
});
