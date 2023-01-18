#!/usr/bin/env bash
exec < /dev/tty && pwd && common/autoinstallers/commitizen/node_modules/.bin/cz --hook || true