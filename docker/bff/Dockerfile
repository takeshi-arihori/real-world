FROM node:24-slim

RUN corepack enable

WORKDIR /app

COPY entrypoint.sh /usr/local/bin/bff-entrypoint

RUN chmod +x /usr/local/bin/bff-entrypoint

CMD ["bff-entrypoint"]
