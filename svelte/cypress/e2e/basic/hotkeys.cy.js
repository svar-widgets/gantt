context("Hotkeys", () => {
	it("rows are selected by arrows", { scrollBehavior: false }, () => {
		cy.visit("/index.html#/local-data");
		cy.viewport(1300, 900);

		cy.wxG("grid").trigger("keydown", { code: "arrowDown" });
		cy.wxG("grid-item", 1).should("have.class", "wx-selected");

		cy.wxG("grid-item", 1).click({ force: true, ctrlKey: true });
		cy.wxG("grid").trigger("keydown", { code: "arrowUp" });
		cy.wxG("grid-item", 5).should("have.class", "wx-selected");

		cy.wxG("grid-item", 11).click({ force: true });
		cy.wxG("grid").trigger("keydown", { code: "arrowDown" });
		cy.wxG("grid-item", 12).should("have.class", "wx-selected");

		for (let i = 0; i < 3; i++)
			cy.wxG("grid").trigger("keydown", { code: "arrowDown" });
		cy.wxG("grid-item", 21).should("have.class", "wx-selected");

		cy.wxG("grid").trigger("keydown", { code: "arrowUp" });
		cy.wxG("grid-item", 20).should("have.class", "wx-selected");

		for (let i = 0; i < 3; i++)
			cy.wxG("grid").trigger("keydown", { code: "arrowUp" });
		cy.wxG("grid-item", 11).should("have.class", "wx-selected");

		cy.wxG("grid-item", 11).click({ force: true });
		cy.wxG("grid-item", 2).click({ force: true, shiftKey: true });
		cy.wxG("grid").trigger("keydown", { code: "arrowDown" });
		cy.wxG("grid-item", 20).should("have.class", "wx-selected");

		cy.wxG("grid-item", 3).click({ force: true });
		cy.wxG("grid-item", 22).click({ force: true, shiftKey: true });
		cy.wxG("grid").trigger("keydown", { code: "arrowUp" });
		cy.wxG("grid-item", 21).should("have.class", "wx-selected");

		cy.shot("rows-selected-by-arrows");
	});

	it("copy-cut-paste with local data", { scrollBehavior: false }, () => {
		const resizeObserverLoopErrRe =
			/^[^(ResizeObserver loop limit exceeded)]/;
		Cypress.on("uncaught:exception", err => {
			if (resizeObserverLoopErrRe.test(err.message)) {
				return false;
			}
		});
		cy.visit(`/index.html#/local-data`);
		cy.viewport(1300, 900);

		cy.wxG("grid-item", 10).click();
		cy.wxG("grid").trigger("keydown", { ctrlKey: true, code: "C" });
		cy.wxG("grid-item", 2).click();
		cy.wxG("grid").trigger("keydown", { ctrlKey: true, code: "V" });
		cy.shot("task-copied-by-hotkey");

		cy.wxG("grid-item", 12).click();
		cy.wxG("grid").trigger("keydown", { ctrlKey: true, code: "X" });
		cy.wxG("grid-item", 2).click();
		cy.wxG("grid").trigger("keydown", { ctrlKey: true, code: "V" });
		cy.shot("task-cut-paste-by-hotkey");

		cy.wxG("grid-item", 20).click();
		cy.wxG("grid-item", 23).click({ force: true, shiftKey: true });
		cy.wxG("grid").trigger("keydown", { ctrlKey: true, code: "C" });
		cy.wxG("grid-item", 3).click();
		cy.wxG("grid").trigger("keydown", { ctrlKey: true, code: "V" });
		cy.shot("tasks-copied-by-hotkey");

		cy.wxG("grid-item", 23).click();
		cy.wxG("grid-item", 20).click({ force: true, shiftKey: true });
		cy.wxG("grid").trigger("keydown", { ctrlKey: true, code: "X" });
		cy.wxG("grid-item", 3).click();
		cy.wxG("grid").trigger("keydown", { ctrlKey: true, code: "V" });
		cy.shot("tasks-cut-paste-by-hotkey");
	});

	it("delete tasks with local data", { scrollBehavior: false }, () => {
		cy.visit(`/index.html#/local-data`);
		cy.viewport(1300, 900);

		cy.wxG("grid-item", 10).click();
		cy.wxG("grid").trigger("keydown", { code: "Backspace" });
		cy.shot("delete-task-by-backspace");

		cy.wxG("grid-item", 12).click();
		cy.wxG("grid-item", 2).click({ ctrlKey: true });
		cy.wxG("grid").trigger("keydown", { code: "Backspace" });
		cy.shot("delete-tasks-by-backspace");

		cy.wxG("grid-item", 30).click();
		cy.wxG("grid").trigger("keydown", { ctrlKey: true, code: "D" });
		cy.shot("delete-task-by-hotkey-combo");

		cy.wxG("grid-item", 31).click();
		cy.wxG("grid-item", 4).click({ ctrlKey: true });
		cy.wxG("grid").trigger("keydown", { ctrlKey: true, code: "D" });
		cy.shot("delete-tasks-by-hotkey-combo");
	});

	it("open-close editor with local data", { scrollBehavior: false }, () => {
		cy.visit(`/index.html#/local-data`);
		cy.viewport(1300, 900);

		cy.wxG("grid-item", 1).click();
		cy.wxG("grid").trigger("keydown", { ctrlKey: true, code: "E" });
		cy.shot("editor-opened-by-hotkey");

		cy.wxG("grid").trigger("keydown", { code: "Escape" });
		cy.shot("editor-closed-by-hotkey");

		cy.wxG("grid-item", 10).click();
		cy.wxG("grid-item", 12).click({ ctrlKey: true });
		cy.wxG("grid").trigger("keydown", { ctrlKey: true, code: "E" });
		cy.shot("editor-opened-by-hotkey-multiselect");

		cy.wxG("grid").trigger("keydown", { code: "Escape" });
		cy.shot("editor-closed-by-hotkey-multiselect");
	});
});
