FROM python:3.11-slim

WORKDIR /app

# Install system deps for Flet
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libgtk-3-0 libmpv1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose FastAPI + Flet ports
EXPOSE 8000 8501

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["python", "main.py"]
