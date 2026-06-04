context("Resource chart", () => {
	const resizeObserverLoopErrRe = /ResizeObserver loop limit exceeded/;
	Cypress.on("uncaught:exception", err => {
		if (resizeObserverLoopErrRe.test(err.message)) return false;
	});

	function expectSyncedScroll(left) {
		cy.get("body").should(() => {
			expect(Cypress.$(".wx-gantt .wx-chart")[0].scrollLeft).to.eq(left);
			expect(
				Cypress.$(".wx-resource-load .wx-chart .wx-scroll")[0]
					.scrollLeft
			).to.eq(left);
		});
	}

	function expectChartsSynced() {
		cy.get("body").should(() => {
			expect(Cypress.$(".wx-gantt .wx-chart")[0].scrollLeft).to.eq(
				Cypress.$(".wx-resource-load .wx-chart .wx-scroll")[0]
					.scrollLeft
			);
		});
	}

	it("resource chart with local data", () => {
		cy.visit(`/index.html#/resource-load/willow`);
		cy.viewport(1300, 900);

		cy.get(".wx-resource-load").should("be.visible");
		cy.wxG("resource-grid").should("be.visible");
		cy.wxG("resource-chart").should("be.visible");
		cy.shot(`resource-chart`);
	});

	it("can select rows in resource grid and chart", () => {
		cy.visit(`/index.html#/resource-load/willow`);
		cy.viewport(1300, 900);

		cy.wxG("resource-grid-row", "r1").click();
		cy.wxG("resource-grid-row", "r1").should("have.class", "wx-selected");
		cy.wxG("resource-chart-row", "r1").should("have.class", "wx-selected");

		cy.wxG("resource-chart-row", "r3")
			.wxG("resource-chart-cell", 1)
			.click({ force: true });
		cy.wxG("resource-grid-row", "r3").should("have.class", "wx-selected");
		cy.wxG("resource-chart-row", "r3").should("have.class", "wx-selected");
		cy.shot(`resource-grid-and-chart-selected`);
	});

	it("rows are selected by arrows in resource grid and chart", () => {
		cy.visit(`/index.html#/resource-load/willow`);
		cy.viewport(1300, 900);

		cy.wxG("resource-grid-row", "dev").find(".wx-cell").first().click();
		cy.wxG("resource-grid").keyDown("ArrowDown");
		cy.wxG("resource-grid-row", "r1").should("have.class", "wx-selected");
		cy.wxG("resource-chart-row", "r1").should("have.class", "wx-selected");
		for (let i = 0; i < 3; i++)
			cy.wxG("resource-grid").keyDown("ArrowDown");
		cy.wxG("resource-grid-row", "r3").should("have.class", "wx-selected");
		cy.wxG("resource-chart-row", "r3").should("have.class", "wx-selected");

		cy.wxG("resource-chart-row", "r4")
			.wxG("resource-chart-cell", 1)
			.click();
		for (let i = 0; i < 3; i++) cy.wxG("resource-chart").keyDown("ArrowUp");
		cy.wxG("resource-grid-row", "r2").should("have.class", "wx-selected");
		cy.wxG("resource-chart-row", "r2").should("have.class", "wx-selected");

		cy.shot(`resource-chart-rows-selected-by-arrows`);
	});

	it("chart cell can highlight non-working days", () => {
		cy.visit(`/index.html#/resource-calendars/willow`);
		cy.viewport(2400, 900);

		// teams and a resource on the default calendar mark weekends as wx-weekend
		cy.wxG("resource-chart-row", "qa")
			.wxG("resource-chart-cell-id", "2026-04-04")
			.should("have.class", "wx-weekend");
		cy.wxG("resource-chart-row", "r4-default")
			.wxG("resource-chart-cell-id", "2026-04-05")
			.should("have.class", "wx-weekend");

		// a resource with a custom calendar marks its own non-working days
		// with that calendar's css class
		cy.wxG("resource-chart-row", "r1-weekends-only-resource")
			.wxG("resource-chart-cell-id", "2026-04-09")
			.should("have.class", "weekends-only-resource");
		cy.wxG("resource-chart-row", "r2-wednesday-off-resource")
			.wxG("resource-chart-cell-id", "2026-04-08")
			.should("have.class", "wednesday-off-resource");
		cy.shot(`resource-chart-weekend`);
	});

	it("chart cell can highlight when resource is overloaded or normal", () => {
		cy.visit(`/index.html#/resource-calendars/willow`);
		cy.viewport(2400, 900);

		cy.wxG("resource-chart-row", "r2-wednesday-off-resource")
			.wxG("resource-chart-cell-id", "2026-04-09")
			.should("have.class", "wx-normal");
		cy.wxG("resource-chart-row", "r3-part-time-resource")
			.wxG("resource-chart-cell-id", "2026-04-08")
			.should("have.class", "wx-normal");
		cy.wxG("resource-chart-row", "dev")
			.wxG("resource-chart-cell-id", "2026-04-09")
			.should("have.class", "wx-normal");

		cy.wxG("resource-chart-row", "r2-wednesday-off-resource")
			.wxG("resource-chart-cell-id", "2026-04-10")
			.should("have.class", "wx-overload");
		cy.wxG("resource-chart-row", "dev")
			.wxG("resource-chart-cell-id", "2026-04-10")
			.should("have.class", "wx-overload");

		// a working day with no assigned load is neither normal nor overloaded
		cy.wxG("resource-chart-row", "r4-default")
			.wxG("resource-chart-cell-id", "2026-04-09")
			.should("not.have.class", "wx-normal")
			.should("not.have.class", "wx-overload");

		cy.shot(`resource-chart-overload`);
	});

	it("chart cell should have load value", () => {
		cy.visit(`/index.html#/resource-calendars/willow`);
		cy.viewport(2400, 900);

		cy.wxG("resource-chart-row", "r2-wednesday-off-resource")
			.wxG("resource-chart-cell-id", "2026-04-09")
			.should($cell => {
				expect($cell.text().trim()).to.eq("8h, 100%");
			});
		cy.wxG("resource-chart-row", "r2-wednesday-off-resource")
			.wxG("resource-chart-cell-id", "2026-04-10")
			.should($cell => {
				expect($cell.text().trim()).to.eq("16h, 200%");
			});
		cy.wxG("resource-chart-row", "r3-part-time-resource")
			.wxG("resource-chart-cell-id", "2026-04-08")
			.should($cell => {
				expect($cell.text().trim()).to.eq("4h, 100%");
			});
		cy.wxG("resource-chart-row", "dev")
			.wxG("resource-chart-cell-id", "2026-04-09")
			.should($cell => {
				expect($cell.text().trim()).to.eq("8h, 100%");
			});
		// no load on a non-working / unassigned day
		cy.wxG("resource-chart-row", "r4-default")
			.wxG("resource-chart-cell-id", "2026-04-09")
			.should($cell => {
				expect($cell.text().trim()).to.eq("");
			});
		cy.wxG("resource-chart-row", "r2-wednesday-off-resource")
			.wxG("resource-chart-cell-id", "2026-04-08")
			.should($cell => {
				expect($cell.text().trim()).to.eq("");
			});
		cy.shot(`resource-chart-load-value`);
	});

	it("chart can navigate by hotkeys", () => {
		cy.visit(`/index.html#/resource-calendars/willow`);
		cy.viewport(2400, 900);

		cy.wxG("resource-chart-row", "r2-wednesday-off-resource")
			.wxG("resource-chart-cell-id", "2026-04-06")
			.click({ force: true });
		const days = ["07", "08", "09", "10", "11"];
		days.forEach(day => {
			cy.wxG("resource-chart").keyDown("ArrowRight");
			cy.wait(100);
			cy.wxG("resource-chart-row", "r2-wednesday-off-resource")
				.wxG("resource-chart-cell-id", `2026-04-${day}`)
				.should("have.focus");
		});
		cy.shot(`resource-chart-navigate-by-hotkeys`);
	});

	it("resource chart h-scroll is synced with gantt chart on scroll", () => {
		cy.visit(`/index.html#/resource-load/willow`);
		cy.viewport(1300, 900);

		cy.wxG("resource-chart").find(".wx-scroll").scrollTo(400, 0);
		expectSyncedScroll(400);

		cy.get(".wx-gantt .wx-chart").scrollTo(800, 0);
		expectSyncedScroll(800);

		cy.wxG("resource-chart").find(".wx-scroll").scrollTo(300, 0);
		expectSyncedScroll(300);

		cy.shot(`resource-chart-scroll-sync`);
	});

	it("resource chart h-scroll is synced with gantt chart on hotkeys", () => {
		cy.visit(`/index.html#/resource-load/willow`);
		cy.viewport(1300, 900);

		cy.wxG("resource-chart-row", "r1")
			.wxG("resource-chart-cell", 1)
			.click({ force: true });
		for (let i = 0; i < 10; i++)
			cy.wxG("resource-chart").keyDown("ArrowRight");
		expectChartsSynced();

		for (let i = 0; i < 8; i++)
			cy.wxG("resource-chart").keyDown("ArrowLeft");

		expectChartsSynced();

		cy.shot(`resource-chart-scroll-sync-hotkeys`);
	});

	it("tooltip are visible by hovering on resource chart cell", () => {
		cy.visit(`/index.html#/resource-load/willow`);
		cy.viewport(1300, 900);

		// hover on resource chart cell without load date
		cy.wxG("resource-chart-row", "r1")
			.wxG("resource-chart-cell", 0)
			.trigger("mousemove");
		cy.get(".wx-tooltip").should("not.exist");

		cy.wxG("resource-chart-row", "r1")
			.wxG("resource-chart-cell", 1)
			.trigger("mousemove");

		cy.get(".wx-tooltip-area").should("be.visible");
		cy.get(".wx-tooltip").should("be.visible");
		cy.get(".wx-tooltip").should("contain.text", "Name:");
		cy.shot(`resource-chart-tooltip`);
	});
});
