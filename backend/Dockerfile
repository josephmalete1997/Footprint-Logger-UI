FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --production=false
COPY . .
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app /app
EXPOSE 3000

ENV NODE_ENV=production
CMD ["npm", "start"]
