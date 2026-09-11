FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Data directory for SQLite database (Railway mounts this as a volume)
RUN mkdir -p /data

# Expose port
EXPOSE 5000

# Use Gunicorn for production
RUN pip install --no-cache-dir gunicorn

WORKDIR /app/backend

CMD gunicorn \
  --bind 0.0.0.0:${PORT:-5000} \
  --workers 2 \
  --timeout 120 \
  --log-level info \
  app:app
