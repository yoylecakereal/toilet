FROM node:18-slim

# Install Python + pip + dependencies for isign
RUN apt-get update && apt-get install -y \
    python3 python3-pip \
    python3-setuptools python3-wheel python3-dev \
    libssl-dev \
    libplist-dev \
    libxml2-dev \
    unzip git \
    && pip3 install --break-system-packages git+https://github.com/apperian/isign.git@python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json .
RUN npm install --production

COPY . .

CMD ["node", "server.js"]
