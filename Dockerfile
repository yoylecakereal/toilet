FROM node:18-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    git build-essential openssl libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Build zsign
RUN git clone https://github.com/zhlynn/zsign.git && \
    cd zsign/src && make && cp zsign /usr/local/bin/

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

CMD ["node", "server.js"]
