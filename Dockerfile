FROM node:18-slim

# Install Python + pip + correct dependencies for isign
RUN apt-get update && apt-get install -y \
    python3 python3-pip \
    libssl-dev \
    libplist-dev \
    libxml2-dev \
    unzip \
    && pip3 install --break-system-packages isign \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json .
RUN npm install --production

COPY . .

CMD ["node", "server.js"]
