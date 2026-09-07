# --- build the static bundle ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Vite inlines import.meta.env.VITE_* at build time, so the URL the
# frontend will call has to be known now, not at container start. It's
# passed as a build arg from docker-compose.yml (see VITE_API_URL there)
# and defaults to the backend's host-mapped port, since it's the
# *browser* (running on the host) that makes these requests, not another
# container on the compose network.
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# --- serve it ---
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
