#!/usr/bin/env bash
# exit on error
set -o errexit

echo "==> Installing backend dependencies..."
pip install -r app/requirements.txt

echo "==> Installing frontend dependencies and building..."
cd app/frontend
npm ci
npm run build
cd ../..

echo "==> Build complete!"
