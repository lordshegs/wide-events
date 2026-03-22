FROM node:22-bookworm-slim

WORKDIR /app
ENV CI=true
# Keep the content-addressable store on a single path so we do not duplicate it under ~/.local/share/pnpm.
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/internal ./packages/internal
COPY packages/collector ./packages/collector

RUN corepack enable \
  && pnpm config set store-dir /pnpm/store \
  && pnpm install --filter @wide-events/collector... --frozen-lockfile \
  && pnpm --filter @wide-events/internal build \
  && pnpm --filter @wide-events/collector build \
  && rm -rf /root/.local/share/pnpm

ENV NODE_ENV=production

EXPOSE 4318

# Resolve workspace deps from the repo root (do not use pnpm in the final image).
CMD ["node", "packages/collector/dist/cli.js"]
