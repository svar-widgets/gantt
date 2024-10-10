export function writable(value: any) {
	let subscriptions: any[] = [];
	const trigger = (b: any) =>
		subscriptions.forEach((a: any) => {
			if (a) a(b);
		});

	return {
		subscribe: (handler: any) => {
			subscriptions.push(handler);
			trigger(value);

			return () =>
				(subscriptions = subscriptions.filter(a => a != handler));
		},
		set: (nv: any) => {
			value = nv;
			trigger(value);
		},
		update: (cb: any) => {
			value = cb(value);
			trigger(value);
		},
	};
}
