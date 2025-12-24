FROM node:18-slim

# Install Python + pip + dependencies for isign
RUN apt-get update && apt-get install -y \
    python3 python3-pip libssl-dev libplist-utils libxml2-utils unzip \
    && pip3 install isign \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json .
RUN npm install --production

COPY . .

CMD ["node", "server.js"]
