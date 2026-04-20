// /api/prisma.config.ts
import { config } from "dotenv";
import { resolve } from "path";

// Принудительно читаем .env из родительской директории
config({ path: resolve(process.cwd(), "../.env") });

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});