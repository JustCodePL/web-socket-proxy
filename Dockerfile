FROM node:20.10.0-alpine as base

FROM base as builder
ENV NODE_ENV development
WORKDIR /app

COPY . .
RUN npm i
RUN npm run build


FROM base as runner
ENV NODE_ENV production

RUN mkdir -p /app
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder --chown=nodejs:nodejs /app/package.json /app/package-lock.json /app/dist ./
RUN npm ci

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

EXPOSE 3000
CMD [ "node", "index"]