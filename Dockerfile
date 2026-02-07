FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Build frontend (vite build only, skip postbuild which uses macOS sed)
RUN npx vite build
# Remove crossorigin attributes (Linux sed syntax)
RUN sed -i 's/ crossorigin//g' dist/index.html

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
