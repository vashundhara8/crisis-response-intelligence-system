# ==========================================================
# CRISIS RESPONSE INTELLIGENCE SYSTEM (CRIS)
# Backend Dockerfile - FastAPI + Python 3.11
# ==========================================================

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (for building psycopg2 and geospatial extensions)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency specifications
COPY requirements.txt .

# Install python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code, migrations, and simulated data
COPY app/ ./app/
COPY alembic.ini ./alembic.ini
COPY alembic/ ./alembic/
COPY data/ ./data/

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    DATABASE_URL=postgresql://postgres:postgres@postgres:5432/crisis_db

EXPOSE 8000

# Run FastAPI with Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
