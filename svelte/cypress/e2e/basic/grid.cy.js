context("Grid", () => {
	it("default grid works with local data", () => {
		cy.visit("/index.html#/local-data");
		cy.viewport(1300, 900);

		cy.wxG("grid").should("exist");
		cy.wxG("grid-header").children().should("have.length", 4);
		cy.wxG("grid-task-list").children().should("have.length", 19);
		cy.shot("default-grid");
	});

	it("no-grid with local data", () => {
		cy.visit("/index.html#/no-grid/willow");
		cy.viewport(1300, 900);

		cy.wxG("grid").should("not.exist");
		cy.shot("grid-absent");
	});

	it("add task via grid buttons with local data", () => {
		cy.visit("/index.html#/local-data");
		cy.viewport(1300, 900);

		cy.wxG("grid-header").find(".wx-action-icon").click();
		cy.wxG("editor").should("exist");
		cy.wxG("grid-task-list").children().should("have.length", 20);
		cy.wxG("grid-task-list")
			.children()
			.last()
			.invoke("attr", "data-id")
			.should("match", /^temp/);
		cy.shot("add-task-via-header-button");

		cy.wxG("grid-item", 10).find(".wx-action-icon").click();
		cy.wxG("editor").should("exist");
		cy.wxG("grid-item", 10)
			.find(".wx-toggle-icon.wxi-menu-down")
			.should("exist");
		cy.wxG("grid-item", 10)
			.next()
			.find(".wx-content")
			.should("have.css", "padding-left", "40px");
		cy.shot("add-task-via-body-button");
	});

	it("grid in compact mode with local data", () => {
		const resizeObserverLoopErrRe =
			/^[^(ResizeObserver loop limit exceeded)]/;
		Cypress.on("uncaught:exception", err => {
			if (resizeObserverLoopErrRe.test(err.message)) {
				return false;
			}
		});
		cy.visit("/index.html#/local-data");
		cy.viewport(650, 900);

		cy.wxG("grid-header").children().should("have.length", 1);
		//cy.wxG("grid-header").children().eq(1).should("not.be.visible");
		cy.wxG("grid-header")
			.children()
			.first()
			.should("have.class", "wx-action")
			.click();
		cy.wxG("grid-header")
			.children()
			.first()
			.should("have.class", "wx-action");
		cy.wxG("grid-header").children().should("have.length", 4);
		//cy.wxG("grid-header").children().eq(3).should("be.visible");

		cy.shot("expand-grid");

		cy.wxG("grid-header").children().first().click();
		cy.wxG("grid-header").children().should("have.length", 1);
		//cy.wxG("grid-header").children().eq(1).should("not.be.visible");
		cy.shot("collapse-grid");

		cy.get(".wx-button").click();
		cy.wxG("editor").should("exist");
		cy.get(".wxi-close").click();
		cy.wxG("grid-header").children().should("have.length", 1);
		//cy.wxG("grid-header").children().eq(1).should("not.be.visible");
		cy.wxG("grid-task-list").children().should("have.length", 20);
		cy.shot("add-task-via-right-down-corner-button");

		cy.wxG("grid-item", 1).find(".wx-action-icon").click();
		cy.wxG("editor").should("exist");
		cy.get(".wxi-close").click();
		cy.wxG("grid-header").children().first().click();
		cy.wxG("grid-task-list")
			.children()
			.eq(4)
			.invoke("attr", "data-id")
			.should("match", /^temp/);
		cy.wxG("grid-header").children().should("have.length", 4);
		cy.wxG("grid-task-list").children().should("have.length", 21);
		cy.shot("add-task-via-body-grid-button");
	});

	it("grid sorting with local data", () => {
		cy.visit("/index.html#/sorting-api/willow");
		cy.viewport(1300, 900);

		const parseDate = dateStr => {
			if (typeof dateStr === "object") return dateStr;
			const [day, month, year] = dateStr.split("-").map(Number);
			return new Date(year, month - 1, day);
		};

		const columns = [
			{
				idx: 0,
				name: "task-name",
				initialOrder: "desc",
				firstInOrder: "Testing",
			},
			{
				idx: 1,
				name: "start-date",
				initialOrder: "asc",
				firstInOrder: "02-04-2024",
			},
			{
				idx: 2,
				name: "duration",
				initialOrder: "asc",
				firstInOrder: 0,
			},
		];

		columns.forEach(column => {
			cy.wxG("grid-header").find(".wx-cell").eq(column.idx).click();
			const isAscInitial = column.initialOrder === "asc";
			let value = column.firstInOrder;

			cy.findRootRows().then($rootRows => {
				$rootRows.each((_, el) => {
					const $el = Cypress.$(el);
					const text = $el.children().eq(column.idx).text().trim();
					let curValue;

					switch (column.name) {
						case "duration":
							curValue = parseInt(text, 10);
							break;
						case "start-date":
							value = parseDate(value);
							curValue = parseDate(text);
							break;
						default:
							curValue = text;
							if (isAscInitial) {
								expect(
									curValue.localeCompare(value)
								).to.be.at.least(0);
							} else {
								expect(
									curValue.localeCompare(value)
								).to.be.at.most(0);
							}
							break;
					}

					if (column.name !== "task-name") {
						if (isAscInitial) {
							expect(curValue).to.be.at.least(value);
						} else {
							expect(curValue).to.be.at.most(value);
						}
					}

					value = curValue;
				});
				cy.shot(`${column.name}-${column.initialOrder}-sort`);
			});

			cy.wxG("grid-header").find(".wx-sort").eq(column.idx).click();

			cy.findRootRows().then($rootRows => {
				$rootRows.each((_, el) => {
					const $el = Cypress.$(el);
					const text = $el.children().eq(column.idx).text().trim();
					let curValue;

					switch (column.name) {
						case "duration":
							curValue = parseInt(text, 10);
							break;
						case "start-date":
							value = parseDate(value);
							curValue = parseDate(text);
							break;
						default:
							curValue = text;
							if (isAscInitial) {
								expect(
									curValue.localeCompare(value)
								).to.be.at.most(0);
							} else {
								expect(
									curValue.localeCompare(value)
								).to.be.at.least(0);
							}
							break;
					}

					if (column.name !== "task-name") {
						if (isAscInitial) {
							expect(curValue).to.be.at.most(value);
						} else {
							expect(curValue).to.be.at.least(value);
						}
					}

					value = curValue;
				});
				cy.shot(`${column.name}-${isAscInitial ? "desc" : "asc"}-sort`);
			});
		});
	});
});
