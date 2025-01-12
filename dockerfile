# OS: Debian Buster
# Node.js: 14.4.0
FROM node:14.4.0-buster

# Create app directory
WORKDIR /
# Install app dependencies (package.json and package-lock.json)
COPY package*.json ./
RUN npm install

# Bundle app source (server.js)
COPY . .

# Listen port
EXPOSE 50697

# Run Node.js
CMD [ "node", "main.js" ]
