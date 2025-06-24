export function startServerAndCreateHonoHandler(server, options) {
    let started = false;
    const ensureStarted = async () => {
        if (!started) {
            await server.start();
            started = true;
        }
    };
    return async (c) => {
        try {
            await ensureStarted();
            const req = c.req;
            let body;
            // Handle request body
            if (req.method !== "GET"
                && req.header("content-type")?.includes("application/json")) {
                try {
                    body = await req.json();
                }
                catch (e) {
                    console.log(e);
                    return c.json({ errors: [{ message: "Invalid JSON in request body" }] }, 400);
                }
            }
            // Create HeaderMap compatible object
            const headerMap = new Map();
            req.raw.headers.forEach((value, key) => {
                headerMap.set(key, value);
            });
            // Create HTTPGraphQLRequest
            const httpGraphQLRequest = {
                method: req.method,
                headers: headerMap, // Cast to satisfy Apollo Server's HeaderMap type
                search: new URL(req.url).search,
                body,
            };
            // Create context
            const contextValue = options?.context
                ? await options.context({ req, c })
                : {};
            const response = await server.executeHTTPGraphQLRequest({
                httpGraphQLRequest,
                context: async () => contextValue,
            });
            // Set response headers
            for (const [key, value] of response.headers) {
                c.header(key, value);
            }
            // Handle response body
            let payload = "";
            if (response.body.kind === "complete") {
                payload = response.body.string;
            }
            else {
                for await (const chunk of response.body.asyncIterator) {
                    payload += chunk;
                }
            }
            return c.newResponse(payload, (response.status ?? 200));
        }
        catch (error) {
            console.error("GraphQL execution error:", error);
            return c.json({ errors: [{ message: "Internal server error" }] }, 500);
        }
    };
}
