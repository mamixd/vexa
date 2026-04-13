# Advanced Modular HaxBall Client System

This project is a custom, AI-integrated HaxBall Client created using a modern stack (Node.js, WebSockets, Python, FastAPI) and customized frontend.

## Architecture

1. **Frontend**: Premium HTML/CSS/JS client UI wrapping the game iframe. Includes scalable Glassmorphism CSS, and dynamic custom header features controlled from an admin dashboard.
2. **Node.js Server**: Acts as the real-time middleware. Sets up WebSockets with the frontend for bidirectional data stream, handles basic REST requests. Provides headless automation logic setup (`bot.js`).
3. **Python Server**: Exposes an AI/ML capable FastAPI server (`python-ai`). Ready to process game ticks and chat filters.

## Setup Instructions

### 1. Requirements
- Node.js (v18+)
- Python (v3.10+)

### 2. Install Dependencies

**Node.js:**
```bash
cd nodejs
npm install
```

**Python:**
```bash
cd python
# Creating a virtual env is recommended: python -m venv venv
pip install -r requirements.txt
```

### 3. Run Systems

Open two split terminals.

**Terminal 1 (Node.js & Frontend Serve):**
```bash
cd nodejs
npm start
```
*Your application will run on `http://localhost:3000`. The frontend UI is served directly from this server.*

**Terminal 2 (Python AI Service):**
```bash
cd python
python main.py
```
*The FastAPI swagger UI is available at `http://localhost:8000/docs`.*

### Features Implemented
- Dynamic Editable Header: Use the side Admin Dashboard on the UI to modify the title. It broadcasts in real-time.
- Multi-Language setup with a unified `shared/config.json`.
- Skeleton for injecting bot scripts natively on a Headless host endpoint.
- Chat filtering and AI simulation logic ready in `ai.py`.



signtool sign /f C:\Sertifika.pfx /p 1234 /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 "C:\Users\Mami\Desktop\Yeni klasör\dist\Vexa HaxBall Client Setup 1.0.0.exe"