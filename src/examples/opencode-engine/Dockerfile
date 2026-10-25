FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates git ripgrep && rm -rf /var/lib/apt/lists/* && useradd --uid 20003 --create-home engine
COPY opencode /usr/local/bin/opencode
COPY opencode.json /etc/opencode/opencode.json
COPY entrypoint.sh /usr/local/bin/lighthouse-engine
RUN chmod 644 /etc/opencode/opencode.json && chmod 755 /etc/opencode /usr/local/bin/lighthouse-engine && mkdir -p /execution /input /output /home/engine/.local/share/opencode /home/engine/.cache && chown -R 20003:20003 /home/engine
ENV HOME=/home/engine
USER 20003:20003
WORKDIR /execution
ENTRYPOINT ["/usr/local/bin/lighthouse-engine"]
