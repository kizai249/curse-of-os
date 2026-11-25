FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY public ./public
COPY server ./server
ENV PORT=8080
EXPOSE 8080
USER node
CMD ["node", "server/server.js"]
