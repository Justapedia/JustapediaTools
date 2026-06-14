#!/bin/bash

# setup-vps.sh
# Automated setup script for Justapedia Tools on Ubuntu/Debian VPS

set -e

echo ">>> Updating system..."
sudo apt-get update

echo ">>> Installing dependencies (Node.js, Git)..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

echo ">>> Installing PM2..."
sudo npm install -g pm2

echo ">>> Setting up environment variables..."

if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.production.example .env
    echo ".env created from .env.production.example — edit it with your auto-login credentials."
else
    echo ".env already exists. Skipping creation."
fi

echo ">>> Installing project dependencies..."
npm install

echo ">>> Building project..."
npm run build

echo ">>> Starting with PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup | tail -n 1 > /tmp/pm2-startup-cmd.sh
chmod +x /tmp/pm2-startup-cmd.sh

echo ">>> Deployment Complete!"
echo "Your app should be running on port 3000."
