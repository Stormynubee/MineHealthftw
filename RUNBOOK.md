# Minehealth Runbook

This document details how to run the full Minehealth application on your local machine.

## Prerequisites

1. **MongoDB**: Make sure MongoDB is installed and running on default port `27017`.
   *(Already installed via winget!)*
2. **Node.js**: Require version ^18+ (tested on Node v24).
3. **Python**: Require version 3.10+ to run the FastAPI server.

## 1. Start the Backend API

Open a new terminal, navigate to the `backend` folder, and start the python server:

```powershell
cd backend

# Install dependencies if you haven't yet
pip install -r requirements.txt

# Start the API server on waitresses auto-reloading
python -m uvicorn server:app --reload
```

The server will automatically spawn on **http://127.0.0.1:8000**.
If you navigate to **http://127.0.0.1:8000/docs** in your browser, you'll see the Swagger UI.

## 2. Start the Frontend App

Open *another* terminal, navigate to the `frontend` folder, and start the React app:

```powershell
cd frontend

# Install dependencies if you haven't yet
npm install --legacy-peer-deps

# Start the web client
npm start
```

Your default browser should automatically pop open to **http://localhost:3000**. Because the frontend contains a `.env` file pointing to `http://127.0.0.1:8000`, it will seamlessly connect to the backend Fastapi instance, ensuring no 404 Axios errors occur!
