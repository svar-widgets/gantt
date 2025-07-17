context(
	"Chart",
	{
		scrollBehavior: false,
	},
	() => {
		it("chart works with local data", () => {
			cy.visit("/index.html#/local-data");
			cy.viewport(1300, 900);

			cy.get(".wx-chart").should("exist");
			cy.wxG("chart-task-list").children().should("have.length", 19);
			cy.wxG("chart-link-list").children().should("have.length", 7);
			cy.shot("chart");
		});

		it("add links with local data", () => {
			cy.visit("/index.html#/local-data");
			cy.viewport(1300, 900);

			cy.wxG("chart-link-list").children().should("have.length", 7);
			cy.wxG("link", 10, "left").click();
			cy.wxG("link", 10, "left").should("be.visible");
			cy.wxG("link", 10, "right").should("not.be.visible");
			cy.wxG("link", 2, "left").click();

			cy.wxG("chart-link-list").children().should("have.length", 8);
			cy.shot("add s2s link");

			cy.wxG("link", 10, "right").click();
			cy.wxG("link", 10, "right").should("be.visible");
			cy.wxG("link", 10, "left").should("not.be.visible");
			cy.wxG("link", 2, "left").click();

			cy.wxG("chart-link-list").children().should("have.length", 9);
			cy.shot("add e2s link");

			cy.wxG("link", 11, "right").click();
			cy.wxG("link", 11, "right").should("be.visible");
			cy.wxG("link", 11, "left").should("not.be.visible");
			cy.wxG("link", 20, "right").click();

			cy.wxG("chart-link-list").children().should("have.length", 10);
			cy.shot("add e2e link");
			cy.wxG("link", 20, "left").click();
			cy.wxG("link", 20, "left").should("be.visible");
			cy.wxG("link", 20, "right").should("not.be.visible");
			cy.wxG("link", 21, "right").click();

			cy.wxG("chart-link-list").children().should("have.length", 11);
			cy.shot("add s2e link");
		});

		describe("DnD in Chart", () => {
			const modifyElement = (element, position, endX, clickX) => {
				element
					.trigger("mousedown", position, {
						button: 0,
						...(clickX ? { clientX: clickX } : {}),
						force: true,
					})
					.wait(100)
					.trigger("mousemove", {
						which: 1,
						clientX: endX,
						force: true,
					})
					.wait(100)
					.trigger("mouseup", { force: true });
			};
			const cellWidth = 100;
			const validDelta = cellWidth / 2 + 1;
			const invalidDelta = cellWidth / 2 - 1;

			beforeEach(() => {
				cy.visit("/index.html#/local-data");
				cy.viewport(1300, 900);
			});

			it("resizes the bar when dragged with delta more than half cellWidth", () => {
				cy.wxG("chart-item", 10).as("el");

				cy.get("@el").then($bar => {
					const barLeft = $bar.offset().left;
					const leftEndX = barLeft - validDelta;
					modifyElement(cy.get("@el"), "left", leftEndX);
					cy.shot("resize-to-left");
				});
				cy.get("@el").then($bar => {
					const barWidth = $bar.width();
					const barLeft = $bar.offset().left;
					const barRight = barLeft + barWidth;
					const rightEndX = barRight + validDelta;
					modifyElement(cy.get("@el"), "right", rightEndX);
					cy.shot("resize-to-right");
				});
				cy.get("@el").invoke("width").should("be.closeTo", 500, 3);
			});

			it("resizes the bar to the lengthUnitWidth from both sides", () => {
				cy.wxG("chart-item", 10).as("el");
				const delta = cellWidth + validDelta;

				cy.get("@el").then($bar => {
					const barLeft = $bar.offset().left;
					const leftEndX = barLeft + delta;
					modifyElement(cy.get("@el"), "left", leftEndX);
					cy.shot("resize-from-left-side-to-length-unit-width");
				});

				cy.get("@el").then($bar => {
					const barLeft = $bar.offset().left;
					const leftEndX = barLeft - delta;
					modifyElement(cy.get("@el"), "left", leftEndX);
					cy.shot("restore-task-size");
				});

				cy.get("@el").then($bar => {
					const barWidth = $bar.width();
					const barLeft = $bar.offset().left;
					const barRight = barLeft + barWidth;
					const rightEndX = barRight - delta;
					modifyElement(cy.get("@el"), "right", rightEndX);
					cy.shot("resize-from-right-side-to-length-unit-width");
				});

				cy.get("@el").invoke("width").should("be.closeTo", 100, 3);
			});

			it("should not resize the bar when dragged with delta less than half cellWidth", () => {
				cy.wxG("chart-item", 10).as("el");

				cy.get("@el").then($bar => {
					const barLeft = $bar.offset().left;
					const leftEndX = barLeft - invalidDelta;
					modifyElement(cy.get("@el"), "left", leftEndX);
					cy.shot("no-resize-to-left");
				});
				cy.get("@el").then($bar => {
					const barWidth = $bar.width();
					const barLeft = $bar.offset().left;
					const barRight = barLeft + barWidth;
					const rightEndX = barRight + invalidDelta;
					modifyElement(cy.get("@el"), "right", rightEndX);
					cy.shot("no-resize-to-right");
				});
				cy.get("@el").invoke("width").should("be.closeTo", 300, 3);
			});

			it("should move bar when dragged with delta more than half cellWidth", () => {
				cy.wxG("chart-item", 10).as("el");
				let initBarLeft;

				cy.get("@el").then($bar => {
					const barWidth = $bar.width();
					const center = $bar.offset().left + barWidth / 2;
					const rightEndX = center + validDelta;
					initBarLeft = $bar.offset().left;

					modifyElement(cy.get("@el"), "center", rightEndX);
					cy.shot("move-to-right");
				});
				cy.get("@el").then($bar => {
					const barWidth = $bar.width();
					const center = $bar.offset().left + barWidth / 2;
					const leftEndX = center - validDelta;
					modifyElement(cy.get("@el"), "center", leftEndX);
					cy.shot("move-to-left");
				});
				cy.get("@el").then($bar => {
					expect(initBarLeft).to.equal($bar.offset().left);
				});
			});

			it("should move bar when dragged with delta less than half cellWidth", () => {
				cy.wxG("chart-item", 10).as("el");
				let initBarLeft;

				cy.get("@el").then($bar => {
					const barWidth = $bar.width();
					const center = $bar.offset().left + barWidth / 2;
					const leftEndX = center - invalidDelta;
					initBarLeft = $bar.offset().left;
					modifyElement(cy.get("@el"), "center", leftEndX);
					cy.shot("no-move-to-left");
				});
				cy.get("@el").then($bar => {
					const barWidth = $bar.width();
					const center = $bar.offset().left + barWidth / 2;
					const rightEndX = center + invalidDelta;
					modifyElement(cy.get("@el"), "center", rightEndX);
					cy.shot("no-move-to-right");
				});

				cy.get("@el").then($bar => {
					expect(initBarLeft).to.equal($bar.offset().left);
				});
			});

			it("should not move bar out of boundaries", () => {
				cy.visit("/index.html#/start-end/willow");
				// cy.viewport(1300, 900);

				cy.wxG("chart-item", 11).as("leftFullEl");
				let lFullStart;
				cy.get("@leftFullEl").then($bar => {
					lFullStart = $bar.offset().left;
					const barWidth = $bar.width();
					const center = $bar.offset().left + barWidth / 2;
					const rightEndX = center - cellWidth;

					modifyElement(cy.get("@leftFullEl"), "center", rightEndX);
					cy.shot("no-move-to-left-for-full-visible-task");
				});
				cy.get("@leftFullEl").then($bar => {
					expect(lFullStart).to.equal($bar.offset().left);
				});

				cy.wxG("chart-item", 20).as("leftPartialEl");
				let lPartStart;
				cy.get("@leftPartialEl").then($bar => {
					lPartStart = $bar.offset().left;
					const barWidth = $bar.width();
					const center = $bar.offset().left + barWidth / 2;
					const rightEndX =
						$bar.offset().left + barWidth + validDelta;
					const clickX = center + barWidth / 2 - validDelta;

					modifyElement(
						cy.get("@leftPartialEl"),
						"right",
						rightEndX,
						clickX
					);

					cy.shot("move-to-right-for-partial-visible-task");
				});
				cy.get("@leftPartialEl").then($bar => {
					expect(lPartStart).to.equal($bar.offset().left - cellWidth);
				});

				cy.get("@leftPartialEl").then($bar => {
					lPartStart = $bar.offset().left;
					const barWidth = $bar.width();
					const center = $bar.offset().left + barWidth / 2;
					const rightEndX =
						$bar.offset().left + barWidth - validDelta;
					const clickX = center + barWidth / 2 - validDelta;

					modifyElement(
						cy.get("@leftPartialEl"),
						"right",
						rightEndX,
						clickX
					);

					cy.shot("no-move-to-left-for-partial-visible-task");
				});
				cy.get("@leftPartialEl").then($bar => {
					expect(lPartStart).to.equal($bar.offset().left);
				});

				// very unstable: crushed without cy.wait inside modifyElement and itself
				cy.wxG("chart-item", 22).as("rightFullEl");
				let rFullStart;
				cy.get("@rightFullEl").then($bar => {
					rFullStart = $bar.offset().left;
					const barWidth = $bar.width();
					const center = $bar.offset().left + barWidth / 2;
					const leftEndX = center + validDelta;

					modifyElement(cy.get("@rightFullEl"), "center", leftEndX);
					cy.shot("move-to-right-border-for-full-visible-task");

					modifyElement(cy.get("@rightFullEl"), "center", leftEndX);
					cy.shot("limited-move-to-right-for-full-visible-task");
				});

				cy.wait(100);

				cy.get("@rightFullEl").then($bar => {
					const leftStart = $bar.offset().left;
					expect(rFullStart).to.equal(leftStart - cellWidth);
				});

				cy.wxG("chart-item", 3).as("rightPartialEl");
				let rPartStart;
				cy.get("@rightPartialEl").then($bar => {
					rPartStart = $bar.offset().left;
					const barWidth = $bar.width();
					const center = $bar.offset().left + barWidth / 2;
					const leftEndX = center - validDelta;

					modifyElement(
						cy.get("@rightPartialEl"),
						"center",
						leftEndX
					);
					cy.shot("move-to-left-for-partial-visible-task");
				});
				cy.get("@rightPartialEl").then($bar => {
					expect(rPartStart).to.equal($bar.offset().left + cellWidth);
				});

				cy.get("@rightPartialEl").then($bar => {
					const barWidth = $bar.width();
					const center = $bar.offset().left + barWidth / 2;
					const leftEndX = center + validDelta;
					rPartStart = $bar.offset().left;
					modifyElement(
						cy.get("@rightPartialEl"),
						"center",
						leftEndX
					);
					cy.shot("no-move-to-right-for-partial-visible-task");
				});
				cy.get("@rightPartialEl").then($bar => {
					expect(rPartStart).to.equal($bar.offset().left);
				});
			});

			it("should track progress when dragging", () => {
				cy.wxG("chart-item", 10).find(".wx-progress-marker").as("el");

				// cy.wxG("chart-item", 10).realHover();
				// cy.get("@el").should("be.visible");
				// cy.shot("progress-marker-visible");

				cy.get("@el").then($marker => {
					const markerLeft = $marker.offset().left;
					const markerWidth = $marker.width();
					const center = markerLeft + markerWidth / 2;

					const leftEndX = center - validDelta;
					modifyElement(cy.get("@el"), "center", leftEndX);
					cy.shot("dragging-progress-to-left");
				});

				cy.get("@el").then($marker => {
					const markerLeft = $marker.offset().left;
					const markerWidth = $marker.width();
					const center = markerLeft + markerWidth / 2;

					const rightEndX = center + validDelta;
					modifyElement(cy.get("@el"), "center", rightEndX);
					cy.shot("dragging-progress-to-right");
				});

				cy.get("@el").should("contain", "100");
				cy.wxG("chart-item", 10)
					.find(".wx-progress-percent")
					.should("have.attr", "style", "width:100%");
			});
		});
	}
);
