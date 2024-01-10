FROM node:20-bullseye

# RUN apt-get update
# RUN apt-get install ca-certificates curl gnupg
# RUN install -m 0755 -d /etc/apt/keyrings
# RUN curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
# RUN chmod a+r /etc/apt/keyrings/docker.gpg

# RUN echo \
#   "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
#   $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
#   tee /etc/apt/sources.list.d/docker.list > /dev/null

# RUN apt-get update
# RUN apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# RUN curl -fsSL https://github.com/devcontainers/features/blob/main/src/docker-in-docker/install.sh -o /tmp/install.sh \
#   && /bin/bash /tmp/install.sh \
#   && rm /tmp/install.sh

RUN curl -fsSL https://raw.githubusercontent.com/devcontainers/features/main/src/docker-in-docker/install.sh | /bin/bash -s

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

COPY ./entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
