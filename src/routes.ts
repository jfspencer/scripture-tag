import type { RouteDefinition } from "@solidjs/router";
import { lazy } from "solid-js";

import Home from "./pages/home";
import ScriptureReader from "./pages/scripture-reader";

export const routes: RouteDefinition[] = [
	{
		path: "/",
		component: Home,
	},
	{
		path: "/scripture",
		component: ScriptureReader,
	},
	{
		path: "**",
		component: lazy(() => import("./errors/404")),
	},
];
