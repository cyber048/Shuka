FROM node:22-bookworm-slim

# Install compilation tools needed for better-sqlite3 native bindings
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package definitions
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies cleanly
RUN npm install
RUN cd client && npm install

# Copy application source
COPY . .

# Build client and run database seed
RUN cd client && npm run build
RUN node scripts/seed.js

# Render standard port
ENV PORT=10000
ENV NODE_ENV=production
EXPOSE 10000

CMD ["npm", "start"]
