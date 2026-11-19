FROM node:22-alpine

WORKDIR /app

# Copy root and client package definitions
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm install
RUN cd client && npm install

# Copy source files
COPY . .

# Build client and seed initial data
RUN npm run build
RUN npm run seed

EXPOSE 3001

ENV PORT=3001
ENV NODE_ENV=production

CMD ["npm", "start"]
