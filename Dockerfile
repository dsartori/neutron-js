FROM node:22-alpine

WORKDIR /usr/src/app

# Pinned version for reproducible builds.
RUN npm install -g http-server@14.1.1

# Copy only the files the game needs at runtime.
COPY --chown=node:node index.html style.css ui.js neutron.js constants.js ai-worker.js favicon.ico ./
COPY --chown=node:node img/ ./img/

USER node

EXPOSE 8080

CMD ["http-server", "-p", "8080", "."]
