import { serve } from "@hono/node-server";

import app from "@/app";
import env from "@/env";

serve(
  {
    fetch: app.fetch,
    port: env.PORT || 4444,
  },
  (info) => {
    // eslint-disable-next-line no-console
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
