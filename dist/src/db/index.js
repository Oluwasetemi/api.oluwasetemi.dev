import { drizzle } from "drizzle-orm/libsql";
import env from "../env.js";
import * as schema from "./schema.js";
const db = drizzle({
    connection: {
        url: env.DATABASE_URL,
        authToken: env.DATABASE_AUTH_TOKEN,
    },
    casing: "snake_case",
    schema,
});
export default db;
