import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";
import nextConfig from "$cwd/next.config.ts";

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout ??
  crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    additionalPrecacheEntries: [{ url: "/~offline", revision }],
    swSrc: "src/app/sw.ts",
    nextConfig,
    useNativeEsbuild: true,
  });
