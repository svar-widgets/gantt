import { TID } from "@wx/lib-state";
import { ILink } from "src/types";

export function getCircularLinks(links: ILink[]): Set<TID> {
	const graph: Record<TID, TID[]> = {};
	const linkMap = new Map();

	for (const link of links) {
		const { source, target } = link;
		(graph[source] ??= []).push(target);
		linkMap.set(`${source}->${target}`, link);
	}

	const visited = new Set<TID>();
	const stack: TID[] = [];
	const inStack = new Set<TID>();
	const cycleLinks = new Set<TID>();

	const dfs = (node: TID) => {
		visited.add(node);
		inStack.add(node);
		stack.push(node);

		for (const next of graph[node] || []) {
			if (!visited.has(next)) {
				dfs(next);
			} else if (inStack.has(next)) {
				const cycleStartIndex = stack.indexOf(next);
				const cyclePath = stack.slice(cycleStartIndex).concat(next);
				for (let i = 0; i < cyclePath.length - 1; i++) {
					const key = `${cyclePath[i]}->${cyclePath[i + 1]}`;
					if (linkMap.has(key)) cycleLinks.add(linkMap.get(key).id);
				}
			}
		}

		stack.pop();
		inStack.delete(node);
	};

	for (const node of Object.keys(graph).map(Number)) {
		if (!visited.has(node)) dfs(node);
	}

	return cycleLinks;
}
