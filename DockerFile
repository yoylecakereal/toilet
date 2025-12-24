FROM node:18

# Install zsign (you can replace this with your own build)
RUN apt-get update && apt-get install -y git build-essential openssl
RUN git clone https://github.com/zhlynn/zsign.git && \
    cd zsign && make && cp zsign /usr/local/bin/

WORKDIR /app
COPY package.json .
RUN npm install
COPY . .

CMD ["node", "server.js"]
