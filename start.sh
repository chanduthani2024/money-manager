#!/bin/bash

echo "🚀 Starting Money Manager Application Setup..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL."
    exit 1
fi

echo "✅ Prerequisites check passed!"

# Setup Backend
echo "📦 Setting up Backend..."
cd backend

if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
else
    echo "Backend dependencies already installed."
fi

echo "🔧 Starting backend server in the background..."
npm run start:dev &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 10

# Setup Frontend
echo "📦 Setting up Frontend..."
cd ../frontend

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
else
    echo "Frontend dependencies already installed."
fi

echo "🎨 Starting frontend server..."
npm start &
FRONTEND_PID=$!

echo "
🎉 Money Manager Application is starting!

📊 Backend API: http://localhost:3001
🖥️  Frontend App: http://localhost:3000

📝 Next Steps:
1. Wait for the frontend to open in your browser
2. Register a new user account
3. Initialize default data by calling:
   - POST http://localhost:3001/api/categories/initialize
   - POST http://localhost:3001/api/expense-reasons/initialize

Press Ctrl+C to stop both servers
"

# Wait for user to stop the servers
wait $BACKEND_PID $FRONTEND_PID