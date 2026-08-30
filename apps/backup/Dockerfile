# The database-dump job (#131).
#
# Its own image rather than a stage of `apps/api/Dockerfile`, for two reasons:
#
#   1. `pg_dump` must be at least the server's major version — it refuses to dump a newer server
#      outright. The server is Postgres 18; Debian bookworm ships client 15. Basing on the
#      official `postgres` image gets the matching version by construction rather than by adding
#      an apt repository and hoping it keeps resolving.
#   2. `veervrat-api-migrate` is on the critical deploy path — migrate-before-deploy is enforced,
#      so a broken migrate image breaks every deploy. Adding apt sources to it for the sake of a
#      once-a-day backup would put that path at risk for no gain.
#
# ⚠️ Pin this to the server's major version. If Postgres is upgraded, this tag moves with it, and
# the dump job is where a mismatch surfaces — quietly, at 02:00, in a job nobody is watching.
FROM postgres:18-bookworm

# azcopy rather than the Azure CLI: one binary against roughly 500MB of Python, and it
# authenticates with the same managed identity everything else here uses. Rather than hand-rolling
# a REST upload, which works fine at today's size and stops working at the block-size boundary
# without warning.
# Pinned, and from the GitHub release rather than `aka.ms/downloadazcopy-v10-linux`. That
# shortlink redirects to a time-limited signed asset URL, so it cannot be pinned at all — every
# build would take whatever is current, which is how a job that worked yesterday stops working
# for a reason nobody changed.
#
# `TARGETARCH` rather than a hardcoded amd64: CD runs on amd64 runners, and building this on an
# arm64 machine otherwise fetches an amd64 binary that cannot execute. That fails at the
# `--version` check below rather than silently, but only because the check is there — without it
# the image would build cleanly and the job would die at 03:00 in an environment nobody watches.
ARG AZCOPY_VERSION=10.32.7
ARG TARGETARCH
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates curl; \
    curl -fsSL "https://github.com/Azure/azure-storage-azcopy/releases/download/v${AZCOPY_VERSION}/azcopy_linux_${TARGETARCH}_${AZCOPY_VERSION}.tar.gz" \
      -o /tmp/azcopy.tgz; \
    tar -xzf /tmp/azcopy.tgz -C /tmp --strip-components=1 --wildcards '*/azcopy'; \
    install -m 0755 /tmp/azcopy /usr/local/bin/azcopy; \
    rm -rf /tmp/azcopy /tmp/azcopy.tgz /var/lib/apt/lists/*; \
    azcopy --version

COPY apps/backup/backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

# Runs as the `postgres` user the base image provides — nothing here needs root, and the dump is
# written to a tmpfs-backed path the job owns.
USER postgres
WORKDIR /tmp

ENTRYPOINT ["/usr/local/bin/backup.sh"]
