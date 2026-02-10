FROM node:22-alpine AS builder

WORKDIR /app

# Install web dependencies
COPY web/package*.json web/
RUN npm --prefix web install

# Copy web source and any pre-built data
COPY web/ web/
COPY web/public/data/ web/public/data/ 2>/dev/null || true

# Build the React web app
RUN npm run web:build

# Serve with nginx
FROM nginx:alpine

COPY --from=builder /app/web/dist /usr/share/nginx/html

# Config for single-page app routing
RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
