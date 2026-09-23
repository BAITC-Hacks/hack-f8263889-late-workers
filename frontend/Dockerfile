# Dev image: installs deps once, runs the Vite dev server with HMR.
# Source is bind-mounted by docker-compose, node_modules stays in the image.
FROM node:22-alpine

WORKDIR /app
RUN corepack enable && corepack prepare yarn@1.22.22 --activate

# Dependencies first for layer caching
COPY package.json yarn.lock ./
# `prepare` runs husky (needs git + ../ layout) — skip it in the container
RUN yarn install --frozen-lockfile --ignore-scripts

COPY . .

EXPOSE 5173
CMD ["yarn", "dev", "--host", "0.0.0.0", "--port", "5173"]
