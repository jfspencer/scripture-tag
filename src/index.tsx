/* @refresh reload */
import "solid-devtools";
import "./index.css";

import { Router } from "@solidjs/router";
import { render } from "solid-js/web";
import App from "./app";
import { routes } from "./routes";
import { ScriptureProvider } from "./stores/ScriptureStore";

const root = document.getElementById("root");

if (!root) {
	throw new Error(
		"Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
	);
}

// Render app with ScriptureProvider wrapping the router
// @ts-expect-error Solid's render may return undefined
render(
	() => (
		<ScriptureProvider>
			<Router root={(props) => <App>{props.children}</App>}>{routes}</Router>
		</ScriptureProvider>
	),
	root!,
);
