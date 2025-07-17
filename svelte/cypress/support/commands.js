// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

Cypress.Commands.add("shot", (...args) => {
	// eslint-disable-next-line cypress/no-unnecessary-waiting
	cy.wait(100);

	const name = args.filter(a => typeof a !== "object").join("-");
	const conf =
		typeof args[args.length - 1] === "object" ? args[args.length - 1] : {};
	const sconf = { ...conf, overwrite: true };

	if (conf.area) cy.get(conf.area).screenshot(name, sconf);
	else cy.screenshot(name, sconf);
});

Cypress.Commands.add(
	"clickNoScroll",
	{
		prevSubject: "element",
	},
	subject => {
		cy.wrap(subject).click({ scrollBehavior: false });
	}
);

Cypress.Commands.add(
	"wxG",
	{
		prevSubject: "optional",
	},
	(subject, type, id, side) => {
		subject = subject ? cy.wrap(subject) : cy;
		switch (type) {
			case "toolbar":
				//[fixme] change on wx-toolbar after update svelte-toolbar version
				return subject.get(".wx-toolbar");
			case "toolbar-button":
				return subject.get(
					`.wx-toolbar .wx-tb-element[data-id="${id}"]`
				);
			case "grid":
				return subject.get(".wx-grid");
			case "grid-header":
				return subject.get(".wx-grid .wx-h-row");
			case "grid-task-list":
				return subject.get(".wx-grid .wx-data");
			case "grid-item":
				return subject.get(`.wx-grid .wx-row[data-id="${id}"]`);

			case "editor":
				return subject.get(".wx-gantt-editor");
			case "chart-task-list":
				return subject.get(".wx-chart .wx-bars");
			case "chart-link-list":
				return subject.get(".wx-chart .wx-links");
			case "chart-item":
				return subject.get(`.wx-bar[data-id="${id}"]`);
			case "chart-selected-line":
				return subject.get(`.wx-area > .wx-selected[data-id="${id}"]`);
			case "link":
				return subject
					.get(`.wx-bar[data-id="${id}"]`)
					.find(`.wx-link.wx-${side}`);
			case "menu":
				return subject.get(".wx-menu");
			case "menu-option":
				return subject.get(`.wx-menu .wx-item[data-id="${id}"]`);

			default:
				throw `not supported arguments for wxG: ${type}, ${id}`;
		}
	}
);

Cypress.Commands.add("findRootRows", () => {
	cy.wxG("grid-task-list")
		.find(".wx-row")
		.filter((_, el) => {
			return (
				Cypress.$(el).find(".wx-content").css("padding-left") === "0px"
			);
		});
});
