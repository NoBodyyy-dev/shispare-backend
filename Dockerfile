FROM node:22.2-alpine
WORKDIR "/frontend"
RUN npm install

COPY . .

CMD ["npm", "run", "dev"]