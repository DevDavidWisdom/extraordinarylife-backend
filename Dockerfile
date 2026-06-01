FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .

EXPOSE 4000

CMD ["sh", "-c", "node src/db/migrate.js && node src/index.js"]
