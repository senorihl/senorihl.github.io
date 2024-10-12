#!/usr/bin/env sh

if [ "$1" = "jekyll" ]; then
  bundle
fi

exec "$@"