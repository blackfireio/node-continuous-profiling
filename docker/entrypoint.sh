#!/usr/bin/env bash
set -e

BASE="$(dirname "$(dirname "$(readlink -f "$0")")")"

USER_ID=$(stat -c %u ${BASE})
USER_NAME=$(stat -c %U ${BASE})
GROUP_ID=$(stat -c %g ${BASE})

chown -R ${USER_ID}:${GROUP_ID} /blackfire

# Because Yarn absolutely wants to find .yarnc file in ${HOME} directory...
USER_HOME=`gosu ${USER_ID}:${GROUP_ID} bash -c 'echo ${HOME}'`
mkdir ${USER_HOME}
chown -R ${USER_ID}:${GROUP_ID} ${USER_HOME}

gosu ${USER_ID}:${GROUP_ID} "$@"
