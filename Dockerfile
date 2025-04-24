ARG FINAL_IMAGE=node:22-alpine
# ARG BASE_IMAGE=gcr.io/distroless/nodejs
ARG BUIL_IMAGE=node:22-alpine


# Stage-1 prod dependencies
FROM ${BUIL_IMAGE} AS prod-dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM ${BUIL_IMAGE} AS build
WORKDIR /app
COPY . .
RUN npm ci \
  && npm run test:run \
  && npm run build

# Stage: image create final image
FROM ${FINAL_IMAGE}
ARG USER=node
# Create app directory
WORKDIR /app
COPY --chown=${USER}:${USER} --from=build /app/dist ./dist
# # Bundle app source
COPY --chown=${USER}:${USER} --from=prod-dependencies /app/node_modules ./node_modules

COPY --chown=${USER}:${USER} ./package*.json ./
USER ${USER}
EXPOSE 3000
# #ENTRYPOINT [ "sleep", "1800" ]
ENTRYPOINT [ "node", "dist/.bin/cli.js" ]
