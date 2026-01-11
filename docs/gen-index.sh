#!/usr/bin/env bash

TITLE=$(basename "$PWD")

echo "---"
echo "title: ${TITLE^}"
echo "---"
echo
echo "# ${TITLE^}"
echo
echo "## 目录"
echo

for f in *.md; do
  [ "$f" = "index.md" ] && continue
  name=$(basename "$f" .md)
  echo "- [${name^}](./$name)"
done

