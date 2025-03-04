const cases = [
	"/base/:skin",
	"/locale/:skin",
	"/tooltips/:skin",
	"/fullscreen/:skin",
	"/templates/:skin",
	"/markers/:skin",
	"/holidays/:skin",
	"/no-grid/:skin",
	"/grid-fill-space-columns/:skin",
	"/grid-fixed-columns/:skin",
	"/grid-custom-columns/:skin",
	"/toolbar/:skin",
	"/toolbar-buttons/:skin",
	"/context-menu/:skin",
	"/menu-handler/:skin",
	"/menu-options/:skin",
	"/custom-form-controls/:skin",
	"/custom-edit-form/:skin",
	"/baseline/:skin",
	"/cell-borders/:skin",
	"/sizes/:skin",
	"/scales/:skin",
	"/prevent-actions/:skin",
	"/readonly/:skin",
	"/performance/:skin",
	"/gantt-multiple/:skin",
	"/start-end/:skin",
	"/zoom/:skin",
	"/custom-zoom/:skin",
	"/length-unit/:skin",
	"/task-types/:skin",
	//"/backend/:skin",
	//"/backend-provider/:skin",
	"/sorting/:skin",
	"/sorting-api/:skin",
];

const skins = ["material", "willow", "willow-dark"];
const links = [];

cases.forEach(w => {
	skins.forEach(s => {
		links.push(w.replace(":skin", s));
	});
});

context("Basic functionality", () => {
	it("widget", () => {
		links.forEach(w => {
			cy.visit(`/index.html#${w}`);
			cy.wait(500);
			cy.shot(w, { area: ".content" });
		});
	});
});
