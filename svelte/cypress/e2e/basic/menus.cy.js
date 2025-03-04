context("Menus", () => {
	it("default menu works with local data", () => {
		cy.visit(`/index.html#/context-menu/willow`);
		cy.viewport(1300, 900);

		cy.wxG("grid-item", 1).rightclick({ position: "center" });
		cy.wxG("menu").should("be.visible");
		cy.wxG("menu").children().should("have.length", 13);
		cy.shot(`default-grid-menu`);

		cy.wxG("menu-option", "add-task").trigger("mouseenter");
		cy.wxG("menu").find(".wx-menu").should("exist");
		cy.shot(`default-menu-with-nested-menu`);

		cy.wxG("chart-item", 1).rightclick("left");
		cy.wxG("menu").should("be.visible");
		cy.wxG("menu").children().should("have.length", 13);
		cy.shot(`default-chart-menu`);

		cy.wxG("menu-option", "add-task").trigger("mouseenter");
		cy.wxG("menu").find(".wx-menu").should("exist");
		cy.shot(`default-chart-menu-with-nested-menu`);
	});

	it("custom menu works with local data", () => {
		cy.visit(`/index.html#/menu-options/willow`);
		cy.viewport(1300, 900);

		cy.wxG("grid-item", 10).rightclick();
		cy.wxG("menu").should("be.visible");
		cy.wxG("menu").children().should("have.length", 6);
		cy.shot(`custom-grid-menu`);

		cy.wxG("chart-item", 1).rightclick("left");
		cy.wxG("menu").should("be.visible");
		cy.wxG("menu").children().should("have.length", 6);
		cy.shot(`custom-chart-menu`);
	});

	it("menu with conditional visibility and reduced options with local data", () => {
		cy.visit(`/index.html#/menu-handler/willow`);
		cy.viewport(1300, 900);

		cy.wxG("grid-item", 1).rightclick();
		cy.wxG("menu").should("not.exist");
		cy.shot(`grid-menu-absent-for-first-task`);

		cy.wxG("chart-item", 1).rightclick("left");
		cy.wxG("menu").should("not.exist");
		cy.shot(`chart-menu-absent-for-first-task`);

		cy.wxG("grid-item", 10).rightclick();
		cy.wxG("menu").should("be.visible");
		cy.shot(`menu-visible-if-not-first-task`);

		// FIXME - unnecessary, necessary because of issues in menu
		cy.wxG("grid-item", 10).click();
		cy.wait(100);

		cy.wxG("chart-item", 10).rightclick("left");
		cy.wxG("menu").should("be.visible");
		cy.shot(`chart-menu-visible-if-not-first-task`);

		// FIXME - unnecessary, necessary because of issues in menu
		cy.wxG("grid-item", 12).click();
		cy.wait(100);

		cy.wxG("grid-item", 12).rightclick();
		cy.wxG("menu").should("be.visible");
		cy.wxG("chart-item", 12).should("have.class", "wx-milestone");
		cy.wxG("menu-option", "add-task").trigger("mouseenter");
		cy.wxG("menu")
			.find(".wx-menu")
			.should("exist")
			.find('[data-id="add-task:child"]')
			.should("not.exist");
		cy.shot(`absence-add-child-grid-menu-option-for-milestone`);

		// FIXME - unnecessary, necessary because of issues in menu
		cy.wxG("grid-item", 12).click();
		cy.wait(100);

		cy.wxG("chart-item", 12).rightclick("left");
		cy.wxG("menu").should("be.visible");
		cy.wxG("menu-option", "add-task").trigger("mouseenter");
		cy.wxG("menu")
			.find(".wx-menu")
			.should("exist")
			.find('[data-id="add-task:child"]')
			.should("not.exist");
		cy.shot(`absence-add-child-chart-menu-option-for-milestone`);
	});

	it("default menu actions with local data", () => {
		const resizeObserverLoopErrRe =
			/^[^(ResizeObserver loop limit exceeded)]/;
		Cypress.on("uncaught:exception", err => {
			if (resizeObserverLoopErrRe.test(err.message)) {
				return false;
			}
		});

		cy.visit(`/index.html#/context-menu/willow`);
		cy.viewport(1300, 1000);

		const taskId = "21";
		let relativeId;
		const menuActions = [
			{
				id: "add-task",
				subActions: [
					{
						id: "add-task:child",
						action: (id, parentId) => {
							cy.wxG("menu-option", parentId).trigger(
								"mouseenter"
							);
							cy.wxG("menu-option", id).click();
						},
						check: () => {
							cy.wxG("grid-item", taskId)
								.next()
								.invoke("attr", "data-id")
								.should("match", /^temp/);
							cy.wxG("grid-item", taskId)
								.find(".wx-toggle-icon.wxi-menu-down")
								.should("exist");
							cy.shot("add-task-child");
						},
					},
					{
						id: "add-task:before",
						action: (id, parentId) => {
							cy.wxG("menu-option", parentId).trigger(
								"mouseenter"
							);
							cy.wxG("menu-option", id).click();
						},
						check: () => {
							cy.wxG("grid-item", taskId)
								.prev()
								.invoke("attr", "data-id")
								.should("match", /^temp/);
							cy.shot("add-task-before");
						},
					},
					{
						id: "add-task:after",
						action: (id, parentId) => {
							cy.wxG("menu-option", parentId).trigger(
								"mouseenter"
							);
							cy.wxG("menu-option", id).click();
						},
						check: () => {
							cy
								.wxG("grid-item", taskId)
								.next()
								.next()
								.invoke("attr", "data-id")
								.should("match", /^temp/),
								cy.shot("add-task-after");
						},
					},
				],
			},
			{
				id: "move-task",
				subActions: [
					{
						id: "move-task:up",
						action: (id, parentId) => {
							cy.wxG("grid-item", taskId)
								.prev()
								.invoke("attr", "data-id")
								.then(data => {
									relativeId = data;
								});

							cy.wxG("menu-option", parentId).trigger(
								"mouseenter"
							);
							cy.wxG("menu-option", id).click();
						},
						check: () => {
							cy.wxG("grid-item", taskId)
								.next()
								.next()
								.invoke("attr", "data-id")
								.then(data => {
									expect(data).to.eq(relativeId);
								});
							cy.shot("move-task-up");
						},
					},
					{
						id: "move-task:down",
						action: (id, parentId) => {
							cy.wxG("grid-item", taskId)
								.next()
								.next()
								.invoke("attr", "data-id")
								.then(data => {
									relativeId = data;
								});

							cy.wxG("menu-option", parentId).trigger(
								"mouseenter"
							);
							cy.wxG("menu-option", id).click();
						},
						check: () => {
							cy.wxG("grid-item", taskId)
								.prev()
								.invoke("attr", "data-id")
								.then(data => {
									expect(data).to.eq(relativeId);
								});
							cy.shot("move-task-down");
						},
					},
				],
			},
			{
				id: "convert-task",
				subActions: [
					{
						id: "convert-task:summary",
						action: (id, parentId) => {
							cy.wxG("menu-option", parentId).trigger(
								"mouseenter"
							);
							cy.wxG("menu-option", id).click();
						},
						check: () => {
							cy.wxG("chart-item", taskId).should(
								"have.class",
								"wx-summary"
							);
							cy.shot("convert-task-to-summary-task");
						},
					},
					{
						id: "convert-task:milestone",
						action: (id, parentId) => {
							cy.wxG("menu-option", parentId).trigger(
								"mouseenter"
							);
							cy.wxG("menu-option", id).click();
						},
						check: () => {
							cy.wxG("chart-item", taskId).should(
								"have.class",
								"wx-milestone"
							);
							cy.shot("convert-task-to-milestone");
						},
					},
					{
						id: "convert-task:task",
						action: (id, parentId) => {
							cy.wxG("menu-option", parentId).trigger(
								"mouseenter"
							);
							cy.wxG("menu-option", id).click();
						},
						check: () => {
							cy.wxG("chart-item", taskId).should(
								"have.class",
								"wx-task"
							);
							cy.shot("convert-task-to-task");
						},
					},
				],
			},
			{
				id: "edit-task",
				action: id => cy.wxG("menu-option", id).click(),
				check: () => {
					cy.wxG("editor").should("exist");
					cy.shot("edit-task");
				},
			},
			{
				id: "indent-task:add",
				action: id => cy.wxG("menu-option", id).click(),
				check: () => {
					cy.wxG("grid-item", taskId)
						.find(".wx-content")
						.should("have.css", "padding-left", "40px");
					cy.wxG("grid-item", taskId)
						.prev()
						.find(".wx-toggle-icon.wxi-menu-down")
						.should("exist");
					cy.shot("indent-task");
				},
			},
			{
				id: "indent-task:remove",
				action: id => cy.wxG("menu-option", id).click(),
				check: () => {
					cy.wxG("grid-item", taskId)
						.find(".wx-content")
						.should("have.css", "padding-left", "20px");
					cy.shot("outdent-task");
				},
			},
			{
				id: "cut-task",
				action: id => {
					cy.wxG("menu-option", id).click();
					cy.wxG("grid-item", 2).rightclick();
					cy.wxG("menu-option", "paste-task").click();
				},
				check: () => {
					cy.findRootRows().then($rootRows => {
						expect($rootRows.eq(2)).to.have.attr("data-id", taskId);
					});
					cy.shot("cut-task");
				},
			},
			{
				id: "copy-task",
				action: id => {
					cy.wxG("menu-option", id).click();
					cy.wxG("grid-item", 2).rightclick();
					cy.wxG("menu-option", "paste-task").click();
				},
				check: () => {
					cy.get(".wx-row");
					cy.findRootRows().then($rootRows => {
						const pastedRow = $rootRows.eq(2);
						const copyedRow = $rootRows.eq(3);
						expect(pastedRow)
							.to.have.attr("data-id")
							.and.match(/^temp/);
						cy.wrap(pastedRow).should(
							"contain",
							"Getting approval"
						);
						expect(copyedRow).to.have.attr("data-id", taskId);
						cy.wrap(copyedRow).should(
							"contain",
							"Getting approval"
						);
					});
					cy.shot("copy-task");
				},
			},
			{
				id: "delete-task",
				action: id => cy.wxG("menu-option", id).click(),
				check: () => {
					cy.wxG("grid-item", taskId).should("not.exist");
					cy.shot("delete-task");
				},
			},
		];

		menuActions.forEach(({ id, action, check, subActions }) => {
			const parentId = id;
			// FIXME - unnecessary, necessary because of issues in menu
			cy.wxG("grid-item", taskId).click();
			cy.wait(100);

			cy.wxG("grid-item", taskId).rightclick();

			if (subActions) {
				subActions.forEach(({ id, check, action }) => {
					action(id, parentId);
					check();
					// FIXME - unnecessary, necessary because of issues in menu
					cy.wxG("grid-item", taskId).click();
					cy.wait(100);

					cy.wxG("grid-item", taskId).rightclick();
				});
			} else {
				action(id);
				check();
			}
		});
	});

	it("menu options disabling works with local data", () => {
		cy.visit(`/index.html#/context-menu/willow`);
		cy.viewport(1300, 900);

		cy.wxG("grid-item", 1).rightclick();
		cy.wxG("menu-option", "indent-task:add").should(
			"have.class",
			"wx-disabled"
		);
		cy.wxG("menu-option", "indent-task:remove").should(
			"have.class",
			"wx-disabled"
		);
		cy.wxG("menu-option", "add-task").trigger("mouseenter");
		cy.wxG("menu")
			.find(".wx-menu")
			.children()
			.eq(1)
			.should("have.class", "wx-disabled");
		cy.wxG("menu-option", "move-task").trigger("mouseenter");
		cy.wxG("menu")
			.find(".wx-menu")
			.children()
			.eq(0)
			.should("have.class", "wx-disabled");
		cy.wxG("menu-option", "convert-task").trigger("mouseenter");
		cy.wxG("menu")
			.find(".wx-menu")
			.children()
			.eq(1)
			.should("have.class", "wx-disabled");
		cy.shot("correct-disabling-for-first-task");

		// FIXME - unnecessary, necessary because of issues in menu
		cy.wxG("grid-item", 10).click();
		cy.wait(100);

		cy.wxG("grid-item", 10).rightclick({ force: true });
		cy.wxG("menu-option", "indent-task:add").should(
			"have.class",
			"wx-disabled"
		);
		cy.wxG("menu-option", "convert-task").trigger("mouseenter");
		cy.wxG("menu")
			.find(".wx-menu")
			.children()
			.eq(0)
			.should("have.class", "wx-disabled");
		cy.shot("correct-disabling-for-second-task");

		// FIXME - unnecessary, necessary because of issues in menu
		cy.wxG("grid-item", 5).click();
		cy.wait(100);

		cy.wxG("grid-item", 5).rightclick();
		cy.wxG("menu-option", "indent-task:remove").should(
			"have.class",
			"wx-disabled"
		);
		cy.wxG("menu-option", "move-task").trigger("mouseenter");
		cy.wxG("menu")
			.find(".wx-menu")
			.children()
			.eq(1)
			.should("have.class", "wx-disabled");
		cy.wxG("menu-option", "convert-task").trigger("mouseenter");
		cy.wxG("menu")
			.find(".wx-menu")
			.children()
			.eq(2)
			.should("have.class", "wx-disabled");
		cy.shot("correct-disabling-for-last-task");
	});
});
