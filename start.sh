#!/usr/bin/env bash
set -e

echo "==> Installing Python dependencies..."
pip install -r app/requirements.txt

echo "==> Starting KGS application..."
cd app
exec python main.py
