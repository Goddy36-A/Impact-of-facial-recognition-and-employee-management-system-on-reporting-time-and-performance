#!/bin/bash
set -e
cd "$(dirname "$0")"

echo ""
echo "  ███████╗ █████╗  ██████╗███████╗███████╗ ██████╗ ██████╗  ██████╗███████╗"
echo "  ██╔════╝██╔══██╗██╔════╝██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔════╝"
echo "  █████╗  ███████║██║     █████╗  █████╗  ██║   ██║██████╔╝██║     █████╗  "
echo "  ██╔══╝  ██╔══██║██║     ██╔══╝  ██╔══╝  ██║   ██║██╔══██╗██║     ██╔══╝  "
echo "  ██║     ██║  ██║╚██████╗███████╗██║     ╚██████╔╝██║  ██║╚██████╗███████╗"
echo "  ╚═╝     ╚═╝  ╚═╝ ╚═════╝╚══════╝╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚══════╝"
echo ""
echo "  FaceForce — Facial Recognition & Employee Management System"
echo ""

if [ ! -d "venv" ]; then
  echo "  [1/4] Creating virtual environment..."
  python3 -m venv venv
fi
source venv/bin/activate

echo "  [2/4] Installing dependencies..."
pip install -r requirements.txt -q

if [ ! -f ".env" ]; then
  echo "  [3/4] No .env found - copying .env.example (edit it before deploying anywhere real)"
  cp .env.example .env
else
  echo "  [3/4] .env found"
fi

echo "  [4/4] Starting server..."
echo ""
echo "  Open http://localhost:5000"
echo "  On first run, a bootstrap admin account is created automatically -"
echo "  watch the output below for its username and one-time generated password."
echo "  Press Ctrl+C to stop"
echo ""

set -a
source .env
set +a

cd backend
python3 app.py
