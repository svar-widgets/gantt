function editorField(label) {
	return cy
		.wxG("editor")
		.contains(".wx-label", label)
		.parent()
		.find(".wx-field-control");
}

const cellWidth = 100;

// drags on the row's chart area, from startCell through every next cell
function scheduleOnChart(rowId, startCell, ...cells) {
	cy.wxG("grid-item", rowId).then($row => {
		const y =
			$row[0].getBoundingClientRect().top + $row[0].offsetHeight / 2;

		cy.get(".wx-chart .wx-bars").then($bars => {
			const left = $bars[0].getBoundingClientRect().left;
			const cellX = cell => left + cell * cellWidth + cellWidth / 2;

			cy.wrap($bars)
				.trigger("mousedown", {
					button: 0,
					clientX: cellX(startCell),
					clientY: y,
					force: true,
				})
				.wait(100);

			cells.forEach(cell => {
				cy.wrap($bars)
					.trigger("mousemove", {
						clientX: cellX(cell),
						clientY: y,
						force: true,
					})
					.wait(100);
			});

			cy.wrap($bars).trigger("mouseup", { force: true });
		});
	});
}

context("Unscheduled tasks", { scrollBehavior: false }, () => {
	beforeEach(() => {
		cy.visit("/index.html#/unscheduled-tasks");
		cy.viewport(1300, 900);
	});

	it("shows 'Unschedule' button for start date control in Editor", () => {
		cy.wxG("grid-item", 10).wxG("grid-cell", "text").dblclick();
		cy.wxG("editor").should("exist");

		editorField("Start date").find(".wx-datepicker").click();
		cy.get(".wx-calendar .wx-buttons")
			.contains("button", "Unschedule")
			.should("be.visible");
		cy.shot("editor-start-clear-button");
	});

	it("disables end date and duration controls for unscheduled task in Editor", () => {
		cy.wxG("grid-item", 22)
			.wxG("grid-cell", "unscheduled")
			.should("contain.text", "yes");

		cy.wxG("grid-item", 22).wxG("grid-cell", "text").dblclick();
		cy.wxG("editor").should("exist");

		editorField("End date")
			.find(".wx-datepicker .wx-text")
			.should("have.class", "wx-disabled");
		editorField("Duration")
			.find(".wx-counter")
			.should("have.class", "wx-disabled");
		cy.shot("editor-end-duration-disabled");
	});

	it("shows 'Unschedule' button in start column inline editor", () => {
		cy.wxG("grid-item", 10).wxG("grid-cell", "start").dblclick();
		cy.wxG("grid-item", 10).find(".wx-editor").should("exist");
		cy.get(".wx-calendar .wx-buttons")
			.contains("button", "Unschedule")
			.should("be.visible");
		cy.shot("grid-start-inline-clear-button");
	});

	it("does not open duration inline editor for unscheduled task", () => {
		cy.wxG("grid-item", 22)
			.wxG("grid-cell", "unscheduled")
			.should("contain.text", "yes");

		cy.wxG("grid-item", 22).wxG("grid-cell", "duration").dblclick();
		cy.wxG("grid-item", 22).find(".wx-editor").should("not.exist");
		cy.shot("grid-duration-inline-disabled");
	});

	it("creates unscheduled task via 'add-task' action column", () => {
		cy.wxG("grid-item", 10)
			.wxG("grid-cell", "add-task")
			.find(".wx-action-icon")
			.click();

		cy.wxG("grid-task-list")
			.contains(".wx-row", "New task")
			.wxG("grid-cell", "unscheduled")
			.should("contain.text", "yes");
		cy.shot("add-unscheduled-task");
	});

	it("does not render bar for unscheduled task", () => {
		cy.wxG("grid-item", 22)
			.wxG("grid-cell", "unscheduled")
			.should("contain.text", "yes");
		cy.wxG("chart-item", 22).should("not.exist");
		cy.shot("unscheduled-task-no-bar");
	});

	it("unschedules task via 'Unschedule' button in start date control in Editor", () => {
		cy.wxG("grid-item", 10)
			.wxG("grid-cell", "unscheduled")
			.should("contain.text", "no");
		cy.wxG("chart-item", 10).should("exist");

		cy.wxG("grid-item", 10).wxG("grid-cell", "text").dblclick();
		editorField("Start date").find(".wx-datepicker").click();
		cy.get(".wx-calendar .wx-buttons")
			.contains("button", "Unschedule")
			.click();

		cy.wxG("grid-item", 10)
			.wxG("grid-cell", "unscheduled")
			.should("contain.text", "yes");
		cy.wxG("chart-item", 10).should("not.exist");
		cy.shot("unschedule-via-editor-clear");
	});

	it("unschedules task via 'Unschedule' button in start column inline editor", () => {
		cy.wxG("grid-item", 10)
			.wxG("grid-cell", "unscheduled")
			.should("contain.text", "no");
		cy.wxG("chart-item", 10).should("exist");

		cy.wxG("grid-item", 10).wxG("grid-cell", "start").dblclick();
		cy.wxG("grid-item", 10).find(".wx-editor").should("exist");
		cy.get(".wx-calendar .wx-buttons")
			.contains("button", "Unschedule")
			.click();

		cy.wxG("grid-item", 10)
			.wxG("grid-cell", "unscheduled")
			.should("contain.text", "yes");
		cy.wxG("chart-item", 10).should("not.exist");
		cy.shot("unschedule-via-inline-clear");
	});

	it("schedules task via click on chart", () => {
		cy.wxG("grid-item", 22)
			.wxG("grid-cell", "unscheduled")
			.should("contain.text", "yes");
		cy.wxG("chart-item", 22).should("not.exist");

		scheduleOnChart(22, 2);

		cy.wxG("grid-item", 22)
			.wxG("grid-cell", "unscheduled")
			.should("contain.text", "no");
		cy.wxG("chart-item", 22).should("exist");
		cy.wxG("grid-item", 22)
			.wxG("grid-cell", "start")
			.should("contain.text", "03-04-2026");
		cy.wxG("grid-item", 22)
			.wxG("grid-cell", "duration")
			.should("contain.text", "1");
		cy.shot("schedule-via-chart-click");
	});

	it("schedules task via drag on chart", () => {
		cy.wxG("grid-item", 22)
			.wxG("grid-cell", "unscheduled")
			.should("contain.text", "yes");
		cy.wxG("chart-item", 22).should("not.exist");

		scheduleOnChart(22, 2, 5);

		cy.wxG("grid-item", 22)
			.wxG("grid-cell", "unscheduled")
			.should("contain.text", "no");
		cy.wxG("chart-item", 22).should("exist");
		cy.wxG("grid-item", 22)
			.wxG("grid-cell", "start")
			.should("contain.text", "03-04-2026");
		cy.wxG("grid-item", 22)
			.wxG("grid-cell", "duration")
			.should("contain.text", "4");
		cy.shot("schedule-via-chart-drag");
	});

	it("shrinks the task back when the drag returns to the start cell", () => {
		scheduleOnChart(22, 2, 5, 2);

		cy.wxG("grid-item", 22)
			.wxG("grid-cell", "start")
			.should("contain.text", "03-04-2026");
		cy.wxG("grid-item", 22)
			.wxG("grid-cell", "duration")
			.should("contain.text", "1");
	});

	it("schedules milestone via click on chart", () => {
		cy.wxG("grid-item", 12)
			.wxG("grid-cell", "unscheduled")
			.should("contain.text", "no");

		// to unschedule the milestone
		cy.wxG("grid-item", 12).wxG("grid-cell", "start").dblclick();
		cy.wxG("grid-item", 12).find(".wx-editor").should("exist");
		cy.get(".wx-calendar .wx-buttons")
			.contains("button", "Unschedule")
			.click();

		cy.wxG("grid-item", 12)
			.wxG("grid-cell", "unscheduled")
			.should("contain.text", "yes");
		cy.wxG("chart-item", 12).should("not.exist");

		scheduleOnChart(12, 2);

		cy.wxG("grid-item", 12)
			.wxG("grid-cell", "unscheduled")
			.should("contain.text", "no");
		cy.wxG("chart-item", 12)
			.should("exist")
			.and("have.class", "wx-milestone");
		cy.wxG("grid-item", 12)
			.wxG("grid-cell", "start")
			.should("contain.text", "03-04-2026");
		cy.shot("schedule-milestone-via-chart-click");
	});

	it("schedules milestone via drag on chart", () => {
		cy.wxG("grid-item", 12)
			.wxG("grid-cell", "unscheduled")
			.should("contain.text", "no");

		// to unschedule the milestone
		cy.wxG("grid-item", 12).wxG("grid-cell", "start").dblclick();
		cy.wxG("grid-item", 12).find(".wx-editor").should("exist");
		cy.get(".wx-calendar .wx-buttons")
			.contains("button", "Unschedule")
			.click();

		cy.wxG("grid-item", 12)
			.wxG("grid-cell", "unscheduled")
			.should("contain.text", "yes");
		cy.wxG("chart-item", 12).should("not.exist");

		scheduleOnChart(12, 2, 4);

		cy.wxG("grid-item", 12)
			.wxG("grid-cell", "unscheduled")
			.should("contain.text", "no");
		cy.wxG("chart-item", 12)
			.should("exist")
			.and("have.class", "wx-milestone");
		cy.wxG("grid-item", 12)
			.wxG("grid-cell", "start")
			.should("contain.text", "05-04-2026");
		cy.shot("schedule-milestone-via-chart-drag");
	});
});
