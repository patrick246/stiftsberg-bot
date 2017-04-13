FROM node:alpine
ADD src/ /usr/share/app
ADD package.json /usr/share/app
WORKDIR /usr/share/app
RUN npm install --production
CMD ["node", "/usr/share/app/index.js"]