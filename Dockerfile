FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 TZ=America/Sao_Paulo
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY --chown=node:node public/ ./public/
COPY --chown=node:node src/ ./src/
COPY --chown=node:node sql/ ./sql/
USER node
EXPOSE 3000
CMD ["node", "src/server.mjs"]
