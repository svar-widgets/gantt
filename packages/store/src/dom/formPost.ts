export function postToNewWindow(
	url: string,
	data: Record<string, string>
): void {
	const form = document.createElement("form");
	form.method = "POST";
	form.action = url;
	form.target = "_blank";

	for (const [name, value] of Object.entries(data)) {
		const input = document.createElement("input");
		input.type = "hidden";
		input.name = name;
		input.value = value;
		form.appendChild(input);
	}

	document.body.appendChild(form);
	form.submit();
	document.body.removeChild(form);
}
