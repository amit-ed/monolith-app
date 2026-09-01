FROM node:18-alpine
WORKDIR /app

COPY package.json .

RUN npm install

COPY server.js .
COPY /public ./public
COPY config.js .

CMD ["node", "server.js"]
