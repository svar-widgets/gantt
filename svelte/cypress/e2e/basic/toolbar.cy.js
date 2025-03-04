context("Toolbar", () => {
	it("default toolbar with local data", () => {
		cy.visit(`/index.html#/toolbar/willow`);
		cy.viewport(1300, 900);

		cy.wxG("toolbar").should("be.visible");
		cy.wxG("grid-item", 1).click();
		cy.wxG("toolbar").children().should("have.length", 13);
		cy.shot(`default-toolbar`);
	});

	it("custom toolbar works with local data", () => {
		cy.visit(`/index.html#/toolbar-custom/willow`);
		cy.viewport(1300, 900);

		cy.wxG("toolbar").should("be.visible");
		cy.wxG("grid-item", 1).click();
		cy.wxG("toolbar").children().should("have.length", 4);
		cy.shot(`custom-toolbar`);
	});

	it("toolbar with limited buttons with local data", () => {
		cy.visit(`/index.html#/toolbar-buttons/willow`);
		cy.viewport(1300, 900);

		cy.wxG("toolbar").should("be.visible");
		cy.wxG("grid-item", 1).click();
		cy.wxG("toolbar").children().should("have.length", 9);
		cy.shot(`limited-buttons-toolbar`);
	});

	it("default toolbar actions with local data", () => {
		const resizeObserverLoopErrRe =
			/^[^(ResizeObserver loop limit exceeded)]/;
		Cypress.on("uncaught:exception", err => {
			if (resizeObserverLoopErrRe.test(err.message)) {
				return false;
			}
		});
		cy.visit(`/index.html#/toolbar/willow`);
		cy.viewport(1300, 900);

		const taskId = "21";
		let relativeId;

		cy.wxG("grid-item", taskId).click();
		const menuActions = [
			{
				id: "add-task",
				action: id => {
					cy.wxG("toolbar-button", id).click();
				},
				check: () => {
					cy.wxG("grid-item", taskId)
						.prev()
						.invoke("attr", "data-id")
						.should("match", /^temp/);
					cy.shot("add-task");
				},
			},
			{
				id: "move-task:up",
				action: id => {
					cy.wxG("grid-item", taskId)
						.prev()
						.invoke("attr", "data-id")
						.then(data => {
							relativeId = data;
						});

					cy.wxG("grid-item", taskId).click();
					cy.wxG("toolbar-button", id).click();
				},
				check: () => {
					cy.wxG("grid-item", taskId)
						.next()
						.invoke("attr", "data-id")
						.then(data => {
							expect(data).to.eq(relativeId);
						});
					cy.shot("add-task-after");
				},
			},
			{
				id: "move-task:down",
				action: id => {
					cy.wxG("grid-item", taskId)
						.next()
						.invoke("attr", "data-id")
						.then(data => {
							relativeId = data;
						});

					cy.wxG("toolbar-button", id).click();
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
			{
				id: "edit-task",
				action: id => cy.wxG("toolbar-button", id).click(),
				check: () => {
					cy.wxG("editor").should("exist");
					cy.shot("edit-task");
				},
			},
			{
				id: "indent-task:add",
				action: id => cy.wxG("toolbar-button", id).click(),
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
				action: id => cy.wxG("toolbar-button", id).click(),
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
					cy.wxG("toolbar-button", id).click();
					cy.wxG("grid-item", 2).click();
					cy.get(`[data-id="paste-task"]`).click();
				},
				check: () => {
					cy.get(".wx-row")
						.filter((_, el) => {
							return (
								Cypress.$(el)
									.find(".wx-content")
									.css("padding-left") === "0px"
							);
						})
						.then($rootRows => {
							expect($rootRows.eq(2)).to.have.attr(
								"data-id",
								taskId
							);
						});
					cy.shot("cut-task");
				},
			},
			{
				id: "copy-task",
				action: id => {
					cy.wxG("grid-item", taskId).click();
					cy.wxG("toolbar-button", id).click();
					cy.wxG("grid-item", 2).click();
					cy.get(`[data-id="paste-task"]`).click();
				},
				check: () => {
					cy.get(".wx-row")
						.filter((_, el) => {
							return (
								Cypress.$(el)
									.find(".wx-content")
									.css("padding-left") === "0px"
							);
						})
						.then($rootRows => {
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
				action: id => {
					cy.wxG("grid-item", taskId).click();
					cy.wxG("toolbar-button", id).click();
				},
				check: () => {
					cy.wxG("grid-item", taskId).should("not.exist");
					cy.shot("delete-task");
				},
			},
		];

		menuActions.forEach(({ id, action, check }) => {
			action(id);
			check();
		});
	});

	it("toolbar buttons disabling works with local data", () => {
		cy.visit(`/index.html#/toolbar/willow`);
		cy.viewport(1300, 900);

		cy.wxG("grid-item", 1).click();
		cy.wxG("toolbar-button", "indent-task:add")
			.find("button")
			.should("have.attr", "disabled");
		cy.wxG("toolbar-button", "indent-task:remove")
			.find("button")
			.should("have.attr", "disabled");
		cy.wxG("toolbar-button", "move-task:up")
			.find("button")
			.should("have.attr", "disabled");
		cy.shot("correct-disabling-for-first-task");

		cy.wxG("toolbar-button", "move-task:down").click();
		cy.wxG("toolbar-button", "indent-task:add")
			.find("button")
			.should("have.attr", "disabled");
		cy.shot("correct-disabling-for-second-task");

		cy.wxG("grid-item", 5).click();
		cy.wxG("toolbar-button", "indent-task:remove")
			.find("button")
			.should("have.attr", "disabled");
		cy.wxG("toolbar-button", "move-task:down")
			.find("button")
			.should("have.attr", "disabled");
		cy.wxG("toolbar-button", "move-task:up").click();
		cy.wxG("toolbar").find("*").should("not.have.attr", "disabled");
		cy.shot("correct-disabling-for-last-and-prev-last-task");
	});
});
