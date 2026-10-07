const resizeObserverLoopError = /ResizeObserver loop limit exceeded/;
Cypress.on("uncaught:exception", error => {
	if (resizeObserverLoopError.test(error.message)) return false;
});

function dragBar(id, delta) {
	cy.wxG("chart-item", id).then($bar => {
		const bar = $bar[0].getBoundingClientRect();
		const endX = bar.left + bar.width / 2 + delta;

		cy.wrap($bar)
			.trigger("mousedown", "center", {
				button: 0,
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
	});
}

context("Autoschedule", { scrollBehavior: false }, () => {
	it("undoes a task drag and its autoschedule cascade", () => {
		cy.visit("/index.html#/autoschedule");
		cy.viewport(1400, 900);
		cy.wait(500);

		let taskLeft;
		let successorLeft;
		cy.wxG("chart-item", "20").then($bar => {
			taskLeft = $bar.offset().left;
		});
		cy.wxG("chart-item", "21").then($bar => {
			successorLeft = $bar.offset().left;
		});
		cy.shot("autoschedule-before-drag");

		dragBar("20", 100);

		cy.wxG("chart-item", "20").should($bar => {
			expect($bar.offset().left).to.be.greaterThan(taskLeft);
		});
		cy.wxG("chart-item", "21").should($bar => {
			expect($bar.offset().left).to.be.greaterThan(successorLeft);
		});
		cy.shot("autoschedule-after-drag");

		cy.get(".wx-layout").trigger("keydown", {
			ctrlKey: true,
			code: "Z",
		});

		cy.wxG("chart-item", "20").should($bar => {
			expect($bar.offset().left).to.equal(taskLeft);
		});
		cy.wxG("chart-item", "21").should($bar => {
			expect($bar.offset().left).to.equal(successorLeft);
		});
		cy.shot("autoschedule-after-undo");
	});
});
