FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm config set fetch-retries 5 && npm config set fetch-retry-factor 2 && npm ci --omit=dev || npm install --omit=dev
COPY . .
EXPOSE 5005
CMD ["node", "index.js"]
