FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY scripts ./scripts
COPY src ./src
COPY site ./site
COPY assets ./assets
RUN node scripts/build.mjs
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY server.mjs support-server.mjs ./
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
