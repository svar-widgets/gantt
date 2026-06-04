context("WBS", () => {
	beforeEach(() => {
		cy.visit("/index.html#/wbs");
		cy.viewport(1300, 900);
	});

	it("prepends WBS column to the grid header", () => {
		// Default 4 columns + WBS = 5
		cy.wxG("grid-header").children().should("have.length", 5);
		cy.wxG("grid-header")
			.find(".wx-cell")
			.first()
			.should("contain.text", "WBS");
	});

	it("shows correct WBS codes based on tree position", () => {
		// id:1 is the first (and only) root → "1"
		cy.wxG("grid-item", 1).children().first().should("contain.text", "1");

		// id:10 is the first child of id:1 → "1.1"
		cy.wxG("grid-item", 10)
			.children()
			.first()
			.should("contain.text", "1.1");

		// id:11 is the second child of id:1 → "1.2"
		cy.wxG("grid-item", 11)
			.children()
			.first()
			.should("contain.text", "1.2");
	});

	it("shows deep WBS codes for grandchild tasks", () => {
		const resizeObserverLoopErrRe = /ResizeObserver loop limit exceeded/;
		Cypress.on("uncaught:exception", err => {
			if (resizeObserverLoopErrRe.test(err.message)) return false;
		});

		// id:11 is second child of root, open its children
		cy.wxG("grid-item", 11).find(".wx-toggle-icon").click();

		// id:110 is the first child of id:11 → "1.2.1"
		cy.wxG("grid-item", 110)
			.children()
			.first()
			.should("contain.text", "1.2.1");

		// id:111 is the second child of id:11 → "1.2.2"
		cy.wxG("grid-item", 111)
			.children()
			.first()
			.should("contain.text", "1.2.2");
	});
});
