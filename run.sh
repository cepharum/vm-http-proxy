#!/bin/bash

cd "$(dirname "$0")"

exec -a http-proxy /usr/bin/env node ./core/main.js
