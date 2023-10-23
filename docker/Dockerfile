ARG NODE_VERSION

FROM node:${NODE_VERSION}

# https://github.com/tianon/gosu/blob/master/INSTALL.md
RUN set -eux; \
	apt-get update; \
	apt-get install -y gosu ruby ruby-dev build-essential curl git; \
	rm -rf /var/lib/apt/lists/*; \
# verify that the binary works
	gosu nobody true

RUN gem install thor:1.2.2 rake package_cloud

RUN curl -Lo gh.tar.gz https://github.com/cli/cli/releases/download/v1.2.0/gh_1.2.0_linux_amd64.tar.gz \
    && tar xzf gh.tar.gz \
    && cp gh_1.2.0_linux_amd64/bin/gh /usr/local/bin/gh \
    && rm -Rf gh.tar.gz gh_1.2.0_linux_amd64/bin/gh
