#!/bin/bash

# Check if virtual environment exists for testing
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Creating one for testing..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Build Docker images
echo "Building backend image..."
docker build -t arxiv-backend -f Dockerfile.backend . || { echo 'Backend image build failed' ; exit 1; }

echo "Building frontend image..."
docker build -t arxiv-frontend -f Dockerfile.frontend . || { echo 'Frontend image build failed' ; exit 1; }

# Run tests
echo "Running tests..."
python -m pytest test_app.py -v || { echo 'Tests failed' ; exit 1; }

# Deactivate virtual environment
deactivate

# Stop and remove existing containers if they are running
docker stop backend frontend
docker rm backend frontend

# Run Docker containers
echo "Running backend container..."
docker run -d --name backend -p 5001:5001 arxiv-backend || { echo 'Failed to run backend container' ; exit 1; }

echo "Running frontend container..."
docker run -d --name frontend -p 8501:8501 --link backend arxiv-frontend || { echo 'Failed to run frontend container' ; exit 1; }

echo "Application is running. Access the frontend at http://localhost:8501"