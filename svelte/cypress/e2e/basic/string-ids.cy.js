context("String Ids", () => {
	beforeEach(() => {
		cy.visit("/index.html#/autoschedule");
		cy.viewport(1400, 900);
	});

	it("context menu are opened for grid rows", () => {
		cy.wxG("grid").should("exist");
		cy.wxG("grid-item", "0").rightclick({ position: "center" });
		cy.wxG("menu").should("be.visible");

		cy.wxG("grid-item", "1").click();
		cy.wait(100);
		cy.wxG("grid-item", "1").rightclick({ position: "left" });
		cy.wxG("menu").should("be.visible");
	});

	it("context menu are opened for bars", () => {
		cy.get(".wx-bars").should("exist");
		cy.wxG("chart-item", "0").rightclick("left");
		cy.wxG("menu").should("be.visible");

		cy.wxG("chart-item", "1").click();
		cy.wait(100);
		cy.wxG("chart-item", "1").rightclick("left");
		cy.wxG("menu").should("be.visible");
	});

	it("editor are opened by clicking on grid row", () => {
		cy.wxG("grid-item", "0").dblclick();
		cy.wxG("editor").should("exist");
		cy.wxG("editor").find("input").first().should("have.value", "Start");

		cy.wxG("grid-item", "1").click();
		cy.wxG("editor").should("exist");
		cy.wxG("editor")
			.find("input")
			.first()
			.should("have.value", "Project planning");
	});

	it("editor are opened by clicking on bar", () => {
		cy.wxG("chart-item", "0").dblclick();
		cy.wxG("editor").should("exist");
		cy.wxG("editor").find("input").first().should("have.value", "Start");

		cy.wxG("editor").find(".wx-button .wxi-close").first().click();
		cy.wxG("chart-item", "1").dblclick();
		cy.wxG("editor").should("exist");
		cy.wxG("editor")
			.find("input")
			.first()
			.should("have.value", "Project planning");
	});

	it("task are selected by clicking on grid row", () => {
		cy.wxG("grid-item", "0").click();
		cy.wxG("grid-item", "0").should("have.class", "wx-selected");

		cy.wxG("grid-item", "1").click();
		cy.wxG("grid-item", "1").should("have.class", "wx-selected");
		cy.wxG("grid-item", "0").should("not.have.class", "wx-selected");
	});

	it("task are selected by clicking on bar", () => {
		cy.wxG("chart-item", "0").click();
		cy.get(".wx-chart .wx-selected").should("have.length", 1);

		cy.wxG("chart-item", "1").click();
		cy.get(".wx-chart .wx-selected").should("have.length", 1);
	});

	it("tooltip are visible by hovering on bar", () => {
		cy.wxG("chart-item", "0").trigger("mousemove");
		cy.get(".wx-tooltip-area").should("be.visible");
		cy.get(".wx-gantt-tooltip-text").should("have.text", "Start");

		cy.wxG("chart-item", "1").trigger("mousemove");
		cy.get(".wx-tooltip-area").should("be.visible");
		cy.get(".wx-gantt-tooltip-text").should(
			"have.text",
			"Project planning"
		);
	});

	it("can delete link by clicking on delete button", () => {
		cy.wxG("polyline", "1").as("link");
		cy.get("@link").click({ force: true });
		cy.get(".wx-line.wx-line-selected").should("exist");
		cy.wxG("chart-item", "11").find(".wx-delete-button-icon").click();
		cy.get("@link").should("not.exist");
	});

	it("can open/close row", () => {
		const resizeObserverLoopErrRe =
			/^[^(ResizeObserver loop limit exceeded)]/;
		Cypress.on("uncaught:exception", err => {
			if (resizeObserverLoopErrRe.test(err.message)) {
				return false;
			}
		});
		cy.wxG("grid-item", "11")
			.find(".wx-toggle-icon")
			.should("exist")
			.click();
		cy.wxG("grid-item", "110").should("exist");

		cy.wxG("grid-item", "11").find(".wx-toggle-icon").click();
		cy.wxG("grid-item", "110").should("not.exist");
	});
});
