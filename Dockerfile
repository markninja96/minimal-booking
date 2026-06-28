FROM node:22-alpine AS deps
WORKDIR /app
RUN npm install --global pnpm@11.0.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
RUN HUSKY=0 pnpm install --frozen-lockfile

FROM node:22-alpine AS build
WORKDIR /app
RUN npm install --global pnpm@11.0.0
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
RUN pnpm build
RUN pnpm prune --prod --ignore-scripts

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./package.json
EXPOSE 3000
CMD ["node", "dist/main.js"]
