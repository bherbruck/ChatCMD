#!/bin/bash

su root

/bin/bash /usr/local/share/docker-init.sh

echo $(docker ps -a)

node /app/dist/index.js
