const PLACEHOLDER = "wx_placeholder_row";
const cellWidth = 100;

function placeholderRow() {
	return cy.wxG("grid-item", PLACEHOLDER);
}

// draws on the placeholder's chart row, from startCell through every next cell
function drawOnChart(startCell, ...cells) {
	placeholderRow().then($row => {
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

context("Placeholder row", { scrollBehavior: false }, () => {
	beforeEach(() => {
		cy.visit("/index.html#/placeholder-row");
		cy.viewport(1300, 900);
	});

	it("renders an empty row after the real tasks", () => {
		cy.wxG("grid-task-list").find(".wx-row").should("have.length", 3);
		placeholderRow()
			.should("exist")
			.and("have.class", "wx-placeholder-row");

		// the hint is shown instead of a name, the other cells stay blank
		placeholderRow()
			.wxG("grid-cell", "text")
			.should("contain.text", "New task");
		["start", "end", "duration"].forEach(id => {
			placeholderRow()
				.wxG("grid-cell", id)
				.invoke("text")
				.invoke("trim")
				.should("eq", "");
		});

		// no bar and no row actions
		cy.wxG("chart-item", PLACEHOLDER).should("not.exist");
		placeholderRow()
			.wxG("grid-cell", "add-task")
			.find(".wx-action-icon")
			.should("not.exist");
		cy.shot("placeholder-row");
	});

	it("is absent when the feature is off", () => {
		cy.visit("/index.html#/base");
		cy.wxG("grid-item", PLACEHOLDER).should("not.exist");
	});

	it("is selectable and navigable as a normal row", () => {
		placeholderRow().click();
		placeholderRow().should("have.class", "wx-selected");

		// arrow-up leaves it, arrow-down comes back to it
		cy.wxG("grid").keyDown("arrowUp");
		cy.wxG("grid-item", 2).should("have.class", "wx-selected");
		placeholderRow().should("not.have.class", "wx-selected");

		cy.wxG("grid").keyDown("arrowDown");
		placeholderRow().should("have.class", "wx-selected");
		cy.shot("placeholder-row-selected");
	});

	it("is not deleted by an action while selected", () => {
		placeholderRow().click();
		cy.wxG("grid").keyDown("backspace");

		cy.wxG("grid-task-list").find(".wx-row").should("have.length", 3);
		cy.wxG("grid-item", 1).should("exist");
		cy.wxG("grid-item", 2).should("exist");
	});

	it("creates nothing on Enter over the add-task cell", () => {
		placeholderRow().wxG("grid-cell", "add-task").click();
		cy.wxG("grid").keyDown("enter");

		cy.wxG("grid-task-list").find(".wx-row").should("have.length", 3);
	});

	it("does not open the task editor on double click", () => {
		placeholderRow().wxG("grid-cell", "add-task").dblclick();
		cy.wxG("editor").should("not.exist");
	});

	it("has no context menu", () => {
		placeholderRow().rightclick();
		cy.wxG("menu").should("not.exist");

		// a real row still has one
		cy.wxG("grid-item", 1).rightclick();
		cy.wxG("menu").should("exist");
	});

	it("creates a task when the name is typed in", () => {
		placeholderRow().wxG("grid-cell", "text").dblclick();
		placeholderRow().find(".wx-editor").should("exist");

		// the hint is not a value - the editor starts empty
		placeholderRow().find(".wx-editor input").should("have.value", "");
		placeholderRow().find(".wx-editor input").type("Typed{enter}");

		cy.wxG("grid-task-list").find(".wx-row").should("have.length", 4);
		cy.wxG("grid-task-list")
			.find(".wx-row")
			.eq(2)
			.should("contain.text", "Typed");

		// a fresh placeholder re-seeds below the new task
		cy.wxG("grid-task-list")
			.find(".wx-row")
			.eq(3)
			.should("have.class", "wx-placeholder-row");
		cy.shot("placeholder-row-committed-by-name");
	});

	it("opens an editor for every column that defines one", () => {
		["text", "start", "end", "duration"].forEach(id => {
			placeholderRow().wxG("grid-cell", id).dblclick();
			placeholderRow().find(".wx-editor").should("exist");
			// close it again without committing
			cy.get("body").type("{esc}");
		});
	});

	it("uses the hint as the name when the duration is edited", () => {
		placeholderRow().wxG("grid-cell", "duration").dblclick();
		placeholderRow().find(".wx-editor").should("exist");
		placeholderRow().find(".wx-editor input").type("4{enter}");

		cy.wxG("grid-task-list").find(".wx-row").should("have.length", 4);
		cy.wxG("grid-task-list")
			.find(".wx-row")
			.eq(2)
			.should("contain.text", "New task")
			.and("contain.text", "4");
		cy.shot("placeholder-row-committed-by-duration");
	});

	it("has no Unschedule button in the start editor", () => {
		placeholderRow().wxG("grid-cell", "start").dblclick();
		placeholderRow().find(".wx-editor").should("exist");
		cy.get(".wx-calendar .wx-buttons")
			.contains("button", "Unschedule")
			.should("not.exist");
	});

	it("creates the task before attaching resources", () => {
		placeholderRow().wxG("grid-cell", "resources").dblclick();
		placeholderRow().find(".wx-editor").should("exist");
		cy.get(".wx-popup .wx-list .wx-item").first().click();
		// the multiselect commits on click-outside, not on escape
		cy.wxG("grid-header").click("topLeft");

		cy.wxG("grid-task-list").find(".wx-row").should("have.length", 4);
		cy.wxG("grid-task-list")
			.find(".wx-row")
			.eq(2)
			.should("contain.text", "New task")
			.wxG("grid-cell", "resources")
			.should("not.have.text", "");

		cy.wxG("grid-task-list")
			.find(".wx-row")
			.eq(3)
			.should("have.class", "wx-placeholder-row");
	});

	it("creates a task by dragging on the chart", () => {
		drawOnChart(1, 3);

		cy.wxG("grid-task-list").find(".wx-row").should("have.length", 4);
		cy.wxG("grid-task-list")
			.find(".wx-row")
			.eq(2)
			.should("contain.text", "New task")
			.and("contain.text", "3");
		cy.shot("placeholder-row-drawn-on-chart");
	});

	it("shrinks the task back when the pointer returns to the start cell", () => {
		drawOnChart(1, 3, 1);

		cy.wxG("grid-task-list").find(".wx-row").should("have.length", 4);
		cy.wxG("grid-task-list")
			.find(".wx-row")
			.eq(2)
			.should("contain.text", "New task")
			.wxG("grid-cell", "duration")
			.should("contain.text", "1");
	});

	it("creates a one-cell task on a plain click on the chart", () => {
		drawOnChart(1);

		cy.wxG("grid-task-list").find(".wx-row").should("have.length", 4);
		cy.wxG("grid-task-list")
			.find(".wx-row")
			.eq(2)
			.should("contain.text", "New task")
			.and("contain.text", "1");

		cy.wxG("grid-task-list")
			.find(".wx-row")
			.eq(3)
			.should("have.class", "wx-placeholder-row");
		cy.shot("placeholder-row-clicked-on-chart");
	});

	it("keeps the re-seeded placeholder in view after a commit", () => {
		drawOnChart(1, 2);

		// the fresh placeholder is the last row and must be reachable
		cy.wxG("grid-task-list")
			.find(".wx-row")
			.last()
			.should("have.class", "wx-placeholder-row")
			.and("be.visible");
	});

	it("cannot be dragged to reorder", () => {
		placeholderRow().then($row => {
			const box = $row[0].getBoundingClientRect();
			const x = box.left + box.width / 2;
			const y = box.top + box.height / 2;

			cy.wrap($row)
				.trigger("mousedown", { button: 0, clientX: x, clientY: y })
				.wait(100);
			cy.get("body")
				.trigger("mousemove", { clientX: x, clientY: y - 40 })
				.wait(100);

			// a real row would have produced a reorder clone by now
			cy.get(".wx-reorder-task").should("not.exist");
			cy.get("body").trigger("mouseup");
		});

		cy.wxG("grid-task-list")
			.find(".wx-row")
			.eq(0)
			.should("contain.text", "First");
	});
});
