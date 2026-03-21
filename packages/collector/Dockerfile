FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json vitest.config.ts ./
COPY packages/internal ./packages/internal
COPY packages/collector ./packages/collector

RUN corepack enable && pnpm install --filter @wide-events/collector... --frozen-lockfile
RUN pnpm --filter @wide-events/collector build

EXPOSE 4318

CMD ["pnpm", "--filter", "@wide-events/collector", "exec", "node", "dist/cli.js"]
