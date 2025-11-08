/* @refresh reload */
import "solid-devtools";
import "./index.css";

import { Router } from "@solidjs/router";
import { render } from "solid-js/web";
import App from "./app";
import { routes } from "./routes";

const root = document.getElementById("root");

if (!root) {
	throw new Error(
		"Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
	);
}

// Render app - ignore type error for Solid's render return type
// @ts-expect-error Solid's render may return undefined
render(() => <Router root={(props) => <App>{props.children}</App>}>{routes}</Router>, root!);
