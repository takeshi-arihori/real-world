FROM node:24-bookworm-slim

ARG TZ=Asia/Tokyo
ARG CLAUDE_CODE_VERSION=latest
ARG GIT_DELTA_VERSION=0.18.2
ARG ZSH_IN_DOCKER_VERSION=1.2.0

ENV TZ=$TZ
ENV DEBIAN_FRONTEND=noninteractive

# GitHub CLI + Docker CLI のリポジトリを追加してパッケージをインストール
RUN apt-get update && apt-get install -y ca-certificates curl gnupg \
    && install -m 0755 -d /etc/apt/keyrings \
    # GitHub CLI
    && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
        | dd of=/etc/apt/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
        > /etc/apt/sources.list.d/github-cli.list \
    # Docker CLI（ASCII armored 形式で保存することで APT が正しく処理できる）
    && curl -fsSL https://download.docker.com/linux/debian/gpg \
        -o /etc/apt/keyrings/docker.asc \
    && chmod a+r /etc/apt/keyrings/docker.asc \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian bookworm stable" \
        > /etc/apt/sources.list.d/docker.list \
    && apt-get update && apt-get install -y \
    git wget zsh jq gh sudo \
    docker-ce-cli docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL "https://github.com/dandavison/delta/releases/download/${GIT_DELTA_VERSION}/git-delta_${GIT_DELTA_VERSION}_amd64.deb" -o delta.deb \
    && dpkg -i delta.deb && rm delta.deb

RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}
RUN corepack enable

RUN sh -c "$(curl -fsSL https://github.com/deluan/zsh-in-docker/releases/download/v${ZSH_IN_DOCKER_VERSION}/zsh-in-docker.sh)" -- \
    -t robbyrussell

COPY bin/ /usr/local/bin/

RUN chmod 755 /usr/local/bin/docker /usr/local/bin/delegate-backend-php /usr/local/bin/php /usr/local/bin/composer \
    && printf '%s\n' 'node ALL=(root) NOPASSWD: /usr/bin/docker *' > /etc/sudoers.d/node-docker \
    && chmod 440 /etc/sudoers.d/node-docker \
    && touch /home/node/.zshrc \
    && chown node:node /home/node/.zshrc
