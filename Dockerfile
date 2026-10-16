FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json ./
COPY src/prisma/schema.prisma ./src/prisma/schema.prisma

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["node", "dist/main"]