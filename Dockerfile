FROM node:18-alpine

WORKDIR /usr/src/app

RUN npm install -g http-server

RUN npm install webpack webpack-cli copy-webpack-plugin css-loader style-loader html-webpack-plugin terser-webpack-plugin webpack-obfuscator --save-dev

COPY . .

EXPOSE 8080


# Set the command to run Jest with --experimental-vm-modules
# CMD ["node", "--experimental-vm-modules", "./node_modules/jest/bin/jest.js"]

# Run Webpack build (for production)
RUN npx webpack --mode production

# Copy the bundled files from the 'dist' directory to a mounted volume
# so you can access them from your host machine
VOLUME ["/usr/src/app/dist"]

CMD ["http-server", ".", "-p", "8080"]