#!/bin/bash
echo ""
echo "  ███████╗ █████╗  ██████╗███████╗███████╗ ██████╗ ██████╗  ██████╗███████╗"
echo "  ██╔════╝██╔══██╗██╔════╝██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔════╝"
echo "  █████╗  ███████║██║     █████╗  █████╗  ██║   ██║██████╔╝██║     █████╗  "
echo "  ██╔══╝  ██╔══██║██║     ██╔══╝  ██╔══╝  ██║   ██║██╔══██╗██║     ██╔══╝  "
echo "  ██║     ██║  ██║╚██████╗███████╗██║     ╚██████╔╝██║  ██║╚██████╗███████╗"
echo "  ╚═╝     ╚═╝  ╚═╝ ╚═════╝╚══════╝╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚══════╝"
echo ""
echo "  FaceForce Pro — Enterprise Employee Intelligence System"
echo "  Version 2.0.0"
echo ""

# Install deps
echo "  [1/3] Checking dependencies..."
pip install flask flask-cors pillow numpy --break-system-packages -q

# Start server
echo "  [2/3] Initializing database..."
echo "  [3/3] Starting server..."
echo ""
echo "  ✅ Running at http://localhost:5000"
echo "  ✅ Default login: admin / admin123"
echo "  Press Ctrl+C to stop"
echo ""

cd "$(dirname "$0")/backend"
python3 app.py
