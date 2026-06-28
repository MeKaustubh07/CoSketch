/**
 * env.ts — load the root .env BEFORE any other server module is evaluated.
 *
 * Must be the very first import in index.ts. ESM evaluates imported modules in
 * order, so this side effect runs before ticket.ts / persistence.ts capture
 * process.env values at module load.
 */
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), "../.env") });
