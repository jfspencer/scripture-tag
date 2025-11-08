/**
 * Effect Runtime Setup
 * Creates a configured runtime for executing Effects in the application
 */

import { type Effect, ManagedRuntime } from "effect";
import { AppLayer } from "./layers";

/**
 * Main application runtime with all services
 * Use this runtime to execute Effects throughout the application
 */
export const AppRuntime = ManagedRuntime.make(AppLayer);

/**
 * Helper to run an Effect with the application runtime
 */
export function runEffect<A, E, R>(effect: Effect.Effect<A, E, R>): Promise<A> {
	// biome-ignore lint/suspicious/noExplicitAny: ManagedRuntime type compatibility
	return AppRuntime.runPromise(effect as any);
}

/**
 * Helper to run an Effect with the application runtime and get Exit result
 */
export function runEffectExit<A, E, R>(effect: Effect.Effect<A, E, R>) {
	// biome-ignore lint/suspicious/noExplicitAny: ManagedRuntime type compatibility
	return AppRuntime.runPromiseExit(effect as any);
}
