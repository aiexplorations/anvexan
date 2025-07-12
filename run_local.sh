#!/bin/bash

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Please run 'python3 -m venv venv' first."
    exit 1
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Start backend in background
echo "Starting backend server..."
python arxiv_paper_getter.py &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "Starting frontend..."
echo "Application will be available at http://localhost:8501"
streamlit run streamlit_app.py --server.port=8501 --server.address=0.0.0.0

# Clean up when script exits
trap "echo 'Stopping backend...'; kill $BACKEND_PID 2>/dev/null" EXIT 