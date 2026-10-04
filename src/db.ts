import { Pool } from "pg";
import { readConfig } from "./config.js";

const config = readConfig();

export const db = new Pool({
  connectionString: config.dbUrl,
});
