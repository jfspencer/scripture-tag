import { type Effect, Exit, Runtime } from "effect";
import { type Accessor, createResource, createSignal } from "solid-js";

/**
 * Bridge Effect-TS with SolidJS reactive system
 */

/**
 * Create a SolidJS resource from an Effect
 */
export function createEffectResource<A, E, R>(
	effect: Effect.Effect<A, E, R>,
	runtime: Runtime.Runtime<R>,
) {
	const [resource] = createResource(async () => {
		const exit = await Runtime.runPromiseExit(runtime)(effect);
		if (Exit.isFailure(exit)) {
			throw exit.cause;
		}
		return exit.value;
	});

	return resource;
}

/**
 * Run an effect and update a signal with the result
 */
export function runEffectIntoSignal<A, E, R>(
	effect: Effect.Effect<A, E, R>,
	runtime: Runtime.Runtime<R>,
	onSuccess: (value: A) => void,
	onError?: (error: E) => void,
) {
	Runtime.runPromiseExit(runtime)(effect).then((exit) => {
		if (Exit.isSuccess(exit)) {
			onSuccess(exit.value);
		} else if (onError && Exit.isFailure(exit)) {
			// Extract the error from the cause
			const error = exit.cause;
			onError(error as E);
		}
	});
}

/**
 * Create a reactive signal-based effect runner
 */
export function createEffectRunner<R>(runtime: Runtime.Runtime<R>) {
	const [loading, setLoading] = createSignal(false);
	const [error, setError] = createSignal<unknown>(null);

	const run = <A, E>(effect: Effect.Effect<A, E, R>, onSuccess: (value: A) => void) => {
		setLoading(true);
		setError(null);

		Runtime.runPromiseExit(runtime)(effect).then((exit) => {
			setLoading(false);
			if (Exit.isSuccess(exit)) {
				onSuccess(exit.value);
			} else if (Exit.isFailure(exit)) {
				setError(exit.cause);
			}
		});
	};

	return {
		run,
		loading,
		error,
	};
}

/**
 * Helper to create a lazy effect resource that only loads when accessed
 */
export function createLazyEffectResource<A, E, R, Args extends unknown[]>(
	effectFn: (...args: Args) => Effect.Effect<A, E, R>,
	runtime: Runtime.Runtime<R>,
) {
	return (...args: Args) => {
		const [resource] = createResource(async () => {
			const effect = effectFn(...args);
			const exit = await Runtime.runPromiseExit(runtime)(effect);
			if (Exit.isFailure(exit)) {
				throw exit.cause;
			}
			return exit.value;
		});
		return resource;
	};
}
