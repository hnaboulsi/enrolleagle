## ---------- build stage ----------
FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_API_BASE_URL=http://localhost:5000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY apps/web/package.json apps/web/package-lock.json* /app/
RUN npm ci --ignore-scripts 2>/dev/null || npm install

COPY apps/web/tsconfig.json /app/tsconfig.json
COPY apps/web/tsconfig.app.json /app/tsconfig.app.json
COPY apps/web/tsconfig.node.json /app/tsconfig.node.json
COPY apps/web/vite.config.ts /app/vite.config.ts
COPY apps/web/index.html /app/index.html
COPY apps/web/src /app/src

RUN npm run build

## ---------- runtime stage ----------
FROM nginx:1.27-alpine

# Install curl for health checks
RUN apk add --no-cache curl

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]
