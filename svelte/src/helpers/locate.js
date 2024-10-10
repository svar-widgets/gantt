export function getID(node) {
	const id = node.getAttribute("data-id");
	const numId = parseInt(id);
	return isNaN(numId) || numId.toString() != id ? id : numId;
}
