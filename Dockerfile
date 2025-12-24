FROM node:18-slim

RUN apt-get update && apt-get install -y \
  git build-essential pkg-config libssl-dev libminizip-dev wget unzip \
  && rm -rf /var/lib/apt/lists/*

# Clone and build zsign using the repo's install/build flow
RUN git clone https://github.com/zhlynn/zsign.git /tmp/zsign && \
    cd /tmp/zsign && \
    chmod +x INSTALL.sh || true && \
    if [ -f ./INSTALL.sh ]; then ./INSTALL.sh; else \
      cd build/linux && make || true; \
    fi && \
    # find the built binary and copy it
    BIN=$(find /tmp/zsign -type f -name zsign -perm /111 -print -quit) && \
    if [ -n "$BIN" ]; then cp "$BIN" /usr/local/bin/zsign; else echo "zsign build failed" >&2; exit 1; fi

WORKDIR /app
COPY package.json .
RUN npm install --production
COPY . .
CMD ["node", "server.js"]
