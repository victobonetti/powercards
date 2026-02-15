# FROM docker.io/node:20-alpine as build
# WORKDIR /app
# COPY package.json package-lock.json ./
# RUN npm ci
# COPY . .
# RUN npm run build

# FROM nginx:alpine
# COPY --from=build /app/dist /usr/share/nginx/html
# EXPOSE 80
# CMD ["nginx", "-g", "daemon off;"]

# Using a simpler approach for now assuming local build or just verify if file exists
# Actually I need to create a proper Dockerfile for the frontend since one doesn't exist.

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
# Install dependencies
RUN npm install
COPY . .
# Build the app
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
