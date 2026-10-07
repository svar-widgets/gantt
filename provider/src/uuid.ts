// crypto.randomUUID doesn't exist on plain HTTP, fallback to Math.random
export function generateUUID(): string {
	if (typeof crypto !== "undefined" && crypto.randomUUID) {
		return crypto.randomUUID();
	} else {
		return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, char => {
			/* eslint-disable no-bitwise */
			const num = (Math.random() * 16) | 0;
			const value = char === "x" ? num : (num & 0x3) | 0x8;
			/* eslint-enable no-bitwise */
			return value.toString(16);
		});
	}
}
