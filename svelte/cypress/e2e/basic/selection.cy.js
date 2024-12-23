context("Selection", () => {
	it("grid and chart works with multiselection", () => {
		cy.visit(`/index.html#/local-data`);
		cy.viewport(1300, 900);

		cy.wxG("grid-item", 10).click();
		cy.wxG("grid-item", 10).should("have.class", "wx-selected");
		cy.wxG("chart-selected-line", 10).should("exist");
		cy.shot(`single-selection`);

		cy.wxG("grid-item", 1).click({ ctrlKey: true });
		cy.wxG("grid-item", 11)
			.click({ ctrlKey: true })
			.click({ ctrlKey: true });
		[1, 10].forEach(id => {
			cy.wxG("grid-item", id).should("have.class", "wx-selected");
			cy.wxG("chart-selected-line", id).should("exist");
		});
		cy.shot(`multiple-selection-with-ctrl-key`);

		cy.wxG("grid-item", 2).click();
		cy.wxG("grid-item", 3).click({ shiftKey: true });
		cy.wxG("grid-item", 1).click({ shiftKey: true });
		// doesn't reduce the number of selected items
		cy.wxG("grid-item", 2).click({ shiftKey: true });

		[1, 10, 11, 12, 2, 20, 21, 22, 23, 3].forEach(id => {
			cy.wxG("grid-item", id).should("have.class", "wx-selected");
			cy.wxG("chart-selected-line", id).should("exist");
		});
		cy.shot(`multiple-selection-with-shift-key`);
	});

	it("menu options disabling during multiselection with local data", () => {
		cy.visit(`/index.html#/context-menu/willow`);
		cy.viewport(1300, 900);

		cy.wxG("grid-item", 11).rightclick();
		cy.wxG("menu-option", "convert-task").trigger("mouseenter");
		cy.wxG("menu")
			.find(".wx-menu")
			.children()
			.eq(0)
			.should("have.class", "wx-disabled");
		cy.shot("correct-disabling-for-one-task");

		cy.wxG("grid-item", 10).click({ ctrlKey: true }).rightclick();
		cy.wxG("menu-option", "convert-task").trigger("mouseenter");
		cy.wxG("menu")
			.find(".wx-menu")
			.children()
			.eq(0)
			.should("have.class", "wx-disabled");
		cy.wxG("menu-option", "indent-task:add").should(
			"have.class",
			"wx-disabled"
		);
		cy.shot("correct-disabling-for-two-tasks");

		cy.wxG("grid-item", 1).click({ ctrlKey: true }).rightclick();
		cy.wxG("menu-option", "add-task").trigger("mouseenter");
		cy.wxG("menu")
			.find(".wx-menu")
			.children()
			.eq(1)
			.should("have.class", "wx-disabled");
		cy.wxG("menu-option", "convert-task").trigger("mouseenter");
		[0, 1].forEach(index => {
			cy.wxG("menu")
				.find(".wx-menu")
				.children()
				.eq(index)
				.should("have.class", "wx-disabled");
		});
		cy.wxG("menu-option", "move-task").trigger("mouseenter");
		cy.wxG("menu")
			.find(".wx-menu")
			.children()
			.eq(0)
			.should("have.class", "wx-disabled");
		cy.wxG("menu-option", "indent-task:add").should(
			"have.class",
			"wx-disabled"
		);
		cy.wxG("menu-option", "indent-task:remove").should(
			"have.class",
			"wx-disabled"
		);
		cy.shot("correct-disabling-with-first-task");

		cy.wxG("grid-item", 5).click({ ctrlKey: true }).rightclick();
		cy.wxG("menu-option", "convert-task").trigger("mouseenter");
		[0, 1, 2].forEach(index => {
			cy.wxG("menu")
				.find(".wx-menu")
				.children()
				.eq(index)
				.should("have.class", "wx-disabled");
		});
		cy.wxG("menu-option", "move-task").trigger("mouseenter");
		[0, 1].forEach(index => {
			cy.wxG("menu")
				.find(".wx-menu")
				.children()
				.eq(index)
				.should("have.class", "wx-disabled");
		});
		cy.shot("correct-disabling-with-last-task");

		cy.wxG("grid-item", 1).click({ ctrlKey: true });
		cy.wxG("grid-item", 10).rightclick();
		cy.wxG("menu-option", "convert-task").trigger("mouseenter");
		[0, 2].forEach(index => {
			cy.wxG("menu")
				.find(".wx-menu")
				.children()
				.eq(index)
				.should("have.class", "wx-disabled");
		});
		cy.wxG("menu-option", "move-task").trigger("mouseenter");
		cy.wxG("menu")
			.find(".wx-menu")
			.children()
			.eq(1)
			.should("have.class", "wx-disabled");
		cy.wxG("menu-option", "indent-task:add").should(
			"have.class",
			"wx-disabled"
		);
		cy.wxG("menu-option", "indent-task:remove").should(
			"have.class",
			"wx-disabled"
		);
		cy.shot("correct-disabling-for-three-tasks");
	});

	it("toolbar buttons disabling during multiselection with local data", () => {
		cy.visit(`/index.html#/toolbar/willow`);
		cy.viewport(1300, 900);

		cy.wxG("grid-item", 11).click();
		cy.wxG("toolbar").find("*").should("not.have.attr", "disabled");
		cy.shot("correct-disabling-for-one-task");

		cy.wxG("grid-item", 10).click({ ctrlKey: true }).rightclick();
		cy.wxG("toolbar-button", "indent-task:add")
			.find("button")
			.should("have.attr", "disabled");
		cy.shot("correct-disabling-for-two-tasks");

		cy.wxG("grid-item", 1).click({ ctrlKey: true }).rightclick();
		cy.wxG("toolbar-button", "move-task:up")
			.find("button")
			.should("have.attr", "disabled");
		cy.wxG("toolbar-button", "indent-task:add")
			.find("button")
			.should("have.attr", "disabled");
		cy.wxG("toolbar-button", "indent-task:remove")
			.find("button")
			.should("have.attr", "disabled");
		cy.shot("correct-disabling-with-first-task");

		cy.wxG("grid-item", 5).click({ ctrlKey: true }).rightclick();
		cy.wxG("toolbar-button", "move-task:up")
			.find("button")
			.should("have.attr", "disabled");
		cy.wxG("toolbar-button", "move-task:down")
			.find("button")
			.should("have.attr", "disabled");
		cy.wxG("toolbar-button", "indent-task:add")
			.find("button")
			.should("have.attr", "disabled");
		cy.wxG("toolbar-button", "indent-task:remove")
			.find("button")
			.should("have.attr", "disabled");
		cy.shot("correct-disabling-with-last-task");

		cy.wxG("grid-item", 1).click({ ctrlKey: true });
		cy.wxG("grid-item", 10).rightclick();
		cy.wxG("toolbar-button", "move-task:up")
			.find("button")
			.should("not.have.attr", "disabled");
		cy.wxG("toolbar-button", "move-task:down")
			.find("button")
			.should("have.attr", "disabled");
		cy.wxG("toolbar-button", "indent-task:add")
			.find("button")
			.should("have.attr", "disabled");
		cy.wxG("toolbar-button", "indent-task:remove")
			.find("button")
			.should("have.attr", "disabled");
		cy.shot("correct-disabling-for-three-tasks");
	});
});
