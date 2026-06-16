FROM node:22-alpine as builder
WORKDIR /notifications
COPY  ./package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine as main
WORKDIR /notifications
COPY --from=builder /notifications/dist ./dist
COPY --from=builder /notifications/node_modules ./node_modules
CMD ["node", "dist/src/app/main.js"]