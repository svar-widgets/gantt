function editorField(label) {
	return cy
		.wxG("editor")
		.contains(".wx-label", label)
		.parent()
		.find(".wx-field-control");
}

function cell(rowId, colId) {
	return cy.wxG("grid-item", rowId).wxG("grid-cell", colId);
}

function toggleInclusiveEnd() {
	cy.contains(".wx-checkbox", "Inclusive end").find("label").click();
}

function selectedDay() {
	return cy.get(".wx-calendar .wx-day.wx-selected:not(.wx-out)");
}

function pickDay(day) {
	cy.get(".wx-calendar .wx-day:not(.wx-out)")
		.contains(new RegExp(`^\\s*${day}\\s*$`))
		.click();
}

context("Inclusive end", { scrollBehavior: false }, () => {
	beforeEach(() => {
		cy.visit("/index.html#/inclusive-end-full");
		cy.viewport(1400, 900);
	});

	it("shows the last day covered in the End column", () => {
		// Thu 2 Apr, 3 days: stored end Tue 7 Apr 00:00
		cell(10, "end").should("contain.text", "06-04-2026");
		cell(10, "stored-end").should("contain.text", "07-04-2026");

		// summary
		cell(1, "end").should("contain.text", "21-04-2026");
		cell(1, "stored-end").should("contain.text", "22-04-2026");
		cy.shot("grid-inclusive-end");
	});

	it("shows the stored end when switched off", () => {
		toggleInclusiveEnd();

		cell(10, "end").should("contain.text", "07-04-2026");
		cell(10, "stored-end").should("contain.text", "07-04-2026");
		cell(1, "end").should("contain.text", "22-04-2026");
		cy.shot("grid-exclusive-end");
	});

	it("does not change bars and durations", () => {
		cy.wxG("chart-item", 10)
			.invoke("outerWidth")
			.then(width => {
				toggleInclusiveEnd();
				cell(10, "end").should("contain.text", "07-04-2026");
				cy.wxG("chart-item", 10)
					.invoke("outerWidth")
					.should("eq", width);
				cell(10, "duration").should("contain.text", "3");
			});
	});

	it("edits the end in the grid as the last day covered", () => {
		// Tue 7 Apr, 2 days: shown Wed 8 Apr, stored Thu 9 Apr 00:00
		cell(11, "end").dblclick();
		selectedDay().should("contain.text", "8");

		pickDay(10);

		cell(11, "end").should("contain.text", "10-04-2026");
		cell(11, "stored-end").should("contain.text", "11-04-2026");
		cell(11, "duration").should("contain.text", "4");
		cy.shot("grid-edit-inclusive-end");
	});

	it("edits the end in the Editor as the last day covered", () => {
		cell(10, "text").dblclick();
		cy.wxG("editor").should("exist");

		editorField("End date").find(".wx-datepicker").click();
		selectedDay().should("contain.text", "6");

		pickDay(8);

		cell(10, "end").should("contain.text", "08-04-2026");
		cell(10, "stored-end").should("contain.text", "09-04-2026");
		cell(10, "duration").should("contain.text", "5");
		cy.shot("editor-edit-inclusive-end");
	});
});
