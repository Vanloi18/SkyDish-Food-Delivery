# Stage 1: Build React application
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

# Google OAuth Client ID
ARG REACT_APP_GOOGLE_CLIENT_ID
ENV REACT_APP_GOOGLE_CLIENT_ID=$REACT_APP_GOOGLE_CLIENT_ID

ENV CI=false

RUN npm run build


# Stage 2: Production Nginx web server
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]