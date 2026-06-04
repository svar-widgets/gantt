function expectCalendarRow(className, top, lefts) {
	cy.get(`.wx-area > div.${className}`).then($els => {
		const row = [...$els].filter(el => el.style.top === top);

		// we can't rely on actual number of cells, because of virtualization
		expect(row.length).to.be.at.least(lefts.length);
		lefts.forEach(left => {
			console.log(left, "left");
			const cell = row.find(el => el.style.left === left);
			expect(cell).to.exist;
			expect(cell.style.top).to.eq(top);
		});
	});
}

function expectNoCalendarRow(className, top) {
	cy.get(`.wx-area > div.${className}`).then($els => {
		const row = [...$els].filter(el => el.style.top === top);
		expect(row).to.have.length(0);
	});
}

const resizeObserverLoopErrRe = /ResizeObserver loop limit exceeded/;
Cypress.on("uncaught:exception", err => {
	if (resizeObserverLoopErrRe.test(err.message)) return false;
});

context("Multiple calendars", { scrollBehavior: false }, () => {
	beforeEach(() => {
		cy.visit("/index.html#/multiple-calendars/willow");
		cy.viewport(1300, 900);
	});

	it("renders global weekend highlights", () => {
		cy.get(".wx-chart").should("exist");
		cy.get(".wx-scale .wx-row:last-child .wx-cell.wx-weekend").should(
			"have.length.at.least",
			1
		);
		cy.shot("multiple-calendars");
	});

	it("renders custom calendar cells with correct positions", () => {
		// task 12 (wednesday-off)
		expectCalendarRow("wednesday-off", "114px", ["0px", "420px"]);

		cy.shot("task-wednesday-off");
	});

	it("renders working-day overrides with correct positions", () => {
		// task 13 (weekends-only): working Sat/Sun over default weekend
		expectCalendarRow("wx-weekend-override", "152px", [
			"180px",
			"240px",
			"600px",
		]);

		cy.shot("task-weekends-only");
	});

	it("does not add calendar overlays on default-calendar task rows", () => {
		// task 10 (default calendar) — no per-row calendar overlay
		expectNoCalendarRow("wednesday-off", "38px");
		expectNoCalendarRow("wx-weekend-override", "38px");
	});
});

context("Multiple calendars: resources", { scrollBehavior: false }, () => {
	beforeEach(() => {
		cy.visit("/index.html#/resource-calendars/willow");
		cy.viewport(1300, 900);
	});

	it("renders resource calendar highlights", () => {
		cy.get(".wx-chart").should("exist");
		cy.shot("multiple-calendars-resources");
	});

	it("renders resource calendar cells for each resource calendar", () => {
		// grouped by resource: each resource group row is highlighted with
		// its own resource-calendar css class
		cy.get(".wx-area > div.weekends-only-resource").should(
			"have.length.at.least",
			1
		);
		cy.get(".wx-area > div.wednesday-off-resource").should(
			"have.length.at.least",
			1
		);
		cy.get(".wx-area > div.part-time-resource").should(
			"have.length.at.least",
			1
		);

		cy.shot("resource-calendar-cells");
	});
});

context(
	"Multiple calendars: resource grouping",
	{ scrollBehavior: false },
	() => {
		beforeEach(() => {
			cy.visit("/index.html#/multiple-calendars-grouped");
			cy.viewport(1300, 900);
		});

		it("keeps resource calendar highlights when multipleResources is on", () => {
			// single-resource groups must still be highlighted: task 20 -> r1
			// (weekends-only-resource), tasks 12/21 -> r2 (wednesday-off-resource)
			cy.get(".wx-area > div.weekends-only-resource").should(
				"have.length.at.least",
				1
			);
			cy.get(".wx-area > div.wednesday-off-resource").should(
				"have.length.at.least",
				1
			);
		});

		it("combines holidays from both resources on a multi-resource group row", () => {
			// task 10's group spans r1 (weekends-only) + r2 (wednesday-off);
			// Wednesday is a non-working day for BOTH, so the cell carries both
			// calendar css classes (the union of holidays)
			cy.get(
				".wx-area > div.weekends-only-resource.wednesday-off-resource"
			).should("have.length.at.least", 1);

			cy.shot("multiple-calendars-grouped-union");
		});
	}
);
