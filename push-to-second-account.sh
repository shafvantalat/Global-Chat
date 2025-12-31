#!/bin/bash
# Script to push to your second GitHub account (shafvantalat)

echo "í´„ Configuring for second GitHub account..."

# Set local config for this repo only
git config --local user.name "shafvantalat"
git config --local user.email "shafvantalat@gmail.com"

echo "âœ… Local config set to: $(git config user.name) <$(git config user.email)>"
echo ""
echo "í³¤ Pushing to upstream (shafvantalat/Global-Chat)..."

# Push to upstream
git push upstream shafvan-via-srf

echo ""
echo "âœ… Done! Code pushed to https://github.com/shafvantalat/Global-Chat"
