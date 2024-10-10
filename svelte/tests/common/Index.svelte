<script>
	import Router, { push } from "svelte-spa-router";
	import { wrap } from "svelte-spa-router/wrap";

	import { links } from "../../demos/routes.js";
	import { skins } from "../../demos/skins.js";
	import { links as localLinks } from "../routes.js";
	import ListRoutes from "./ListRoutes.svelte";

	import { Material, Willow, WillowDark } from "../../src";
	import { Globals, Locale, popupContainer } from "wx-svelte-core";

	const defRoute = links[0][0].replace(/\/:skin$/, "/willow");
	const routes = {
		"/": wrap({
			component: {},
			conditions: () => {
				push(defRoute);
				return false;
			},
		}),
		"/routes": wrap({
			component: ListRoutes,
			props: { routes: links.map(x => x[0]) },
		}),
	};

	let skin = "willow";
	const skinSettings = {};
	function onRouteChange(path) {
		const parts = path.split("/");
		Object.assign(
			skinSettings,
			(skins.find(a => a.id === parts[2]) || {}).props
		);
		skin = parts[2];
	}

	const allLinks = [...localLinks, ...links];
	allLinks.forEach(a => {
		const [path, , component] = a;
		routes[path] = wrap({
			component,
			userData: a,
			props: { skinSettings },
			conditions: x => {
				onRouteChange(x.location);
				return true;
			},
		});
	});
</script>

<Material />
<Willow />
<WillowDark />

<div class="wx-{skin}-theme content" use:popupContainer>
	<Locale>
		<Globals>
			<Router {routes} />
		</Globals>
	</Locale>
</div>

<style>
	.content {
		height: 100%;
		width: 100%;
		overflow: hidden;
		padding: 0;
		margin: 0;
	}
	.content :global(h4) {
		font-size: 16px;
		font-weight: 300;
		margin-bottom: 12px;
		border-bottom: var(--wx-border);
	}

	.content :global(h3) {
		font-size: 18px;
		margin: 12px 0;
		font-weight: normal;
	}
	.content :global(.demo-box) {
		margin: 20px;
	}
	.content :global(.demo-box + .demo-box) {
		margin-top: 40px;
	}
	.content :global(.demo-code) {
		font-family: monospace;
		line-height: 30px;
	}

	.content :global(.demo-status) {
		height: 30px;
		line-height: 30px;
		background: rgba(0, 0, 0, 0.15);
		padding-left: 10px;
	}
</style>
