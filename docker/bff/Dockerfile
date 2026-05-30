FROM node:24-slim

RUN corepack enable

WORKDIR /app

CMD ["sh", "-c", "pnpm install --frozen-lockfile --force && pnpm start"]
