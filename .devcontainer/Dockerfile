FROM node:24-bookworm-slim

ARG TZ=Asia/Tokyo
ARG CLAUDE_CODE_VERSION=latest
ARG GIT_DELTA_VERSION=0.18.2
ARG ZSH_IN_DOCKER_VERSION=1.2.0

ENV TZ=$TZ
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    ca-certificates curl gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
        | dd of=/etc/apt/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
        > /etc/apt/sources.list.d/github-cli.list \
    && apt-get update && apt-get install -y \
    git wget zsh jq gh \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL "https://github.com/dandavison/delta/releases/download/${GIT_DELTA_VERSION}/git-delta_${GIT_DELTA_VERSION}_amd64.deb" -o delta.deb \
    && dpkg -i delta.deb && rm delta.deb

RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}
RUN corepack enable

RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/deluan/zsh-in-docker/${ZSH_IN_DOCKER_VERSION}/zsh-in-docker.sh)" -- \
    -t robbyrussell

# Create .zshrc for node user to prevent first-time zsh setup prompt
RUN touch /home/node/.zshrc && chown node:node /home/node/.zshrc

USER node
