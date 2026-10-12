#!/bin/sh
set -eu

node /opt/gsc-mcp/init-state.mjs

# Run upstream CLI commands, such as setup, using the same identity and home.
if [ "$#" -gt 0 ]; then
    exec search-console-mcp "$@"
fi

exec supergateway \
    --stdio search-console-mcp \
    --outputTransport streamableHttp \
    --stateful \
    --port 8000 \
    --streamableHttpPath /mcp \
    --healthEndpoint /healthz
