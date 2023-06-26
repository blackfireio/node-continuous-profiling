ARG NODE_VERSION

FROM node:${NODE_VERSION}

# https://github.com/tianon/gosu/blob/master/INSTALL.md
RUN set -eux; \
	apt-get update; \
	apt-get install -y gosu ruby ruby-dev build-essential curl git; \
	rm -rf /var/lib/apt/lists/*; \
# verify that the binary works
	gosu nobody true

RUN gem install rake package_cloud
