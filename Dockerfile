FROM node:18-alpine

WORKDIR /usr/src/app

RUN npm install -g http-server

COPY . .

EXPOSE 8080

# Uncomment only one of the following CMDs:

# Set the command to run Jest with --experimental-vm-modules
# CMD ["node", "--experimental-vm-modules", "./node_modules/jest/bin/jest.js"]

# Start the http server
CMD ["http-server", ".", "-p", "8080"]
