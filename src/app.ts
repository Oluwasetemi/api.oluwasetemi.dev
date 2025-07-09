import configureOpenAPI from "@/lib/configure-open-api";
import createApp from "@/lib/create-app";
import analytics from "@/routes/analytics/analytics.index";
import graphql from "@/routes/graphql/graphql.index";
import index from "@/routes/index.route";
import tasks from "@/routes/tasks/tasks.index";

const app = createApp();

configureOpenAPI(app);

const routes = [index, tasks, graphql, analytics] as const;

routes.forEach((route) => {
  app.route("/", route);
});

export type AppType = (typeof routes)[number];

export default app;
