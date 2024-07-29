#!/bin/bash

# Build Docker images
echo "Building backend image..."
docker build -t arxiv-backend -f Dockerfile.backend . || { echo 'Backend image build failed' ; exit 1; }

echo "Building frontend image..."
docker build -t arxiv-frontend -f Dockerfile.frontend . || { echo 'Frontend image build failed' ; exit 1; }

# Stop and remove existing containers if they are running
docker stop backend frontend
docker rm backend frontend

# Run Docker containers
echo "Running backend container..."
docker run -d --name backend -p 5000:5000 arxiv-backend || { echo 'Failed to run backend container' ; exit 1; }

echo "Running frontend container..."
docker run -d --name frontend -p 8501:8501 --link backend arxiv-frontend || { echo 'Failed to run frontend container' ; exit 1; }

echo "Application is running. Access the frontend at http://localhost:8501"