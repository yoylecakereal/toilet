FROM node:18-slim

RUN apt-get update && apt-get install -y \
    python3 python3-pip \
    libssl-dev \
    libplist-dev \
    libxml2-dev \
    unzip \
    && pip3 install --break-system-packages isign==2.0.0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json .
RUN npm install --production

COPY . .

CMD ["node", "server.js"]
