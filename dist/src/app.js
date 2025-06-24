import configureOpenAPI from "./lib/configure-open-api.js";
import createApp from "./lib/create-app.js";
import graphql from "./routes/graphql/graphql.index.js";
import index from "./routes/index.route.js";
import tasks from "./routes/tasks/tasks.index.js";
const app = createApp();
configureOpenAPI(app);
const routes = [index, tasks, graphql];
routes.forEach((route) => {
    app.route("/", route);
});
export default app;
