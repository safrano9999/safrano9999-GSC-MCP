# safrano9999-GSC-MCP

The unmodified upstream [`search-console-mcp`](https://github.com/saurabhsharma2u/search-console-mcp)
package, version **2.1.3**, served through Supergateway as Streamable HTTP.
This is a community integration with Google's APIs, not a Google-maintained MCP server.

- Image: `ghcr.io/safrano9999/safrano9999-gsc-mcp:latest`
- MCP: `http://<container>:8000/mcp`
- Gateway health: `http://<container>:8000/healthz` (not a Google credentials check)
- Internal port: **8000**, fixed in the entrypoint.
- Runs as the unprivileged `node` user (UID/GID 1000).

## Configuration

Run `./config.sh` to generate the environment and Quadlet/Compose configuration
from `env.example` and `container.example`. No application `config.conf_example`
is needed. Credentials belong only in the generated local `.env`, never in Git
or the image. The examples contain no credentials.

`GSC_MCP_PUBLISH_PORT` selects the external port; an empty value leaves the MCP
available only on the container network. `ADDITIONAL_LINE` and numbered variants
accept additional Quadlet settings such as `Network=core`.

The gateway does not authenticate clients. Keep it on a private container network
or loopback, or use an authenticated HTTPS reverse proxy. Upstream includes tools
that can modify Search Console state; access to the MCP grants access to those
tools within the Google account's permissions.

### Service account (no persistent data volume required for queries)

Enable the Google Search Console API in your Google Cloud project. Add the service
account email to your property in Search Console with the appropriate permissions.
Set both `GOOGLE_CLIENT_EMAIL` and `GOOGLE_PRIVATE_KEY` in the local `.env`.
Represent private-key line breaks as literal `\n` on one line.

`PAGESPEED_API_KEY` is optional for PageSpeed Insights. A normal Google API key
does not authenticate Search Console access.

### OAuth (persistent volume required)

Set `GSC_MCP_VOLUMES=${CONTAINER_NAME}-data:/data:Z` in the container configuration
before creating the container. Leave the service-account fields empty. Optional
`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` select your own OAuth desktop client;
otherwise upstream's defaults are used.

For the initial browser login, temporarily add
`ADDITIONAL_LINE_02=PublishPort=127.0.0.1:3000:3000` and regenerate the Quadlet.
Once the image is available locally through Smart1 and the container is running:

```sh
podman exec -it <container-name> search-console-mcp setup
```

When using a browser on another computer, forward the callback with
`ssh -L 3000:127.0.0.1:3000 <user>@<host>` and open the URL printed by setup.
Port 3000 is only the OAuth callback; it is not the MCP port. Remove its publication
after setup. Reconnect the MCP client after account setup.

`/data` is the container user's home. It preserves the encrypted account/token
configuration and a randomly generated `machine-id`. Both `/etc/machine-id` and
`/var/lib/dbus/machine-id` point to that file. The fixed `USER=node` and persistent
identity allow upstream to decrypt its configuration after container replacement.
Back up the complete volume; do not copy just the encrypted token file or import
an encrypted configuration from a different machine identity.

## Development and publishing

Develop in `core/safrano9999/safrano9999-GSC-MCP`, publish, then pull the checkout
under Rafael when deploying.

`config.sh` is a **hardlink**, not a fork or symlink, to
`SCRIPTS/safrano9999/config/config.sh` in the local development workspace.
Git stores file content, not hardlink relationships. Restore this relationship
from the SOT when setting up another development checkout; do not edit it here.

Build source of truth:
`SCRIPTS/githubactions/safrano9999-GSC-MCP/{scripts,workflows}`.
Run `SCRIPTS/githubactions/sync.py safrano9999-GSC-MCP` before publishing to refresh
the generated `.github` files.

`fire.sh safrano9999-GSC-MCP` uses the existing monthly `tag.sh` logic:
new commits receive the next `YYYY.M.N` repository tag (initially `2026.10.1`)
plus `latest`. That numbered tag triggers GitHub Actions. An unchanged commit
does not create another release. A manual workflow dispatch can rebuild an
existing numbered release tag.

GitHub Actions alone builds, checks the MCP handshake/tools and OAuth storage
across container replacement, then publishes `latest` plus that exact repository
release tag. Image labels use the same version. The upstream package's `2.1.3`
version is separate from this wrapper's release numbering.
The base image uses the existing Supergateway digest from the Smart1 inventory;
no other server implementation replaces the upstream package.

On core/Rafael, all image pulls go through the explicitly requested Smart1 update
flow. Repository creation does not add this image to `images.json`, pull it, or
deploy/restart a host container.
