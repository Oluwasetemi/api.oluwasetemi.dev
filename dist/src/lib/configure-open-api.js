import { Scalar } from "@scalar/hono-api-reference";
import packageJSON from "../../package.json" with { type: "json" };
export default function configureOpenAPI(app) {
    app.doc("/doc", {
        openapi: "3.0.0",
        info: {
            version: packageJSON.version,
            title: "Tasks API",
        },
    });
    app.get("/reference", Scalar({
        url: "/doc",
        theme: "kepler",
        layout: "classic",
        defaultHttpClient: {
            targetKey: "js",
            clientKey: "axios",
        },
    }));
}
