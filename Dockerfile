FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY scripts ./scripts
COPY src ./src
COPY site ./site
COPY assets ./assets
RUN node scripts/build.mjs && npm prune --omit=dev
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY server.mjs support-server.mjs qr-analytics.mjs ./
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
