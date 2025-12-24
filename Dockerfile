FROM node:18-slim

# Install dependencies needed by zsign + openssl
RUN apt-get update && apt-get install -y \
    openssl libssl-dev libzip4 libbz2-1.0 liblzma5 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy prebuilt zsign binary
COPY bin/zsign /usr/local/bin/zsign
RUN chmod +x /usr/local/bin/zsign

COPY package.json .
RUN npm install --production

COPY . .

CMD ["node", "server.js"]
