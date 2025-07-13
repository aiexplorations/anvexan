#!/bin/bash

# AnveXan Development Server
echo "🚀 Starting AnveXan Development Environment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the correct directory
if [ ! -f "arxiv_paper_getter.py" ]; then
    echo -e "${RED}❌ Please run this script from the anvexan project root directory${NC}"
    exit 1
fi

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Frontend directory not found${NC}"
    exit 1
fi

# Check if virtual environment exists for backend
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}⚠️  Creating Python virtual environment...${NC}"
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Check if frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Installing frontend dependencies...${NC}"
    cd frontend
    npm install
    cd ..
fi

# Start backend server
echo -e "${GREEN}🐍 Starting Flask Backend (port 5001)...${NC}"
python arxiv_paper_getter.py &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend development server
echo -e "${GREEN}⚛️  Starting React Frontend (port 3000)...${NC}"
cd frontend
npm start &
FRONTEND_PID=$!

# Function to cleanup on script exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down servers...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup INT TERM

echo -e "${GREEN}✅ Development servers started!${NC}"
echo -e "   📱 Frontend: http://localhost:3000"
echo -e "   🔗 Backend:  http://localhost:5001"
echo -e "\n${YELLOW}Press Ctrl+C to stop all servers${NC}"

# Wait for user to stop
wait