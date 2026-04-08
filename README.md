# React + Express Chat Application

A full-stack, real-time chat application built with React, Node.js, Express, Socket.IO, and MongoDB.

## Project Structure

This project follows a clean separated architecture:
- `client/`: React (Vite) frontend application built with JavaScript
- `server/`: Node.js + Express backend API with Socket.IO for real-time messaging

## Environment Setup

### Server
Create `server/.env` matching your environment:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/chat-app
JWT_SECRET=your-jwt-secret-here
CLIENT_URL=http://localhost:5173
CHANNEL_AUDIT_RETENTION_DAYS=90
CHANNEL_AUDIT_MAX_ENTRIES=500
```

### Client (Frontend)
Create `client/.env.local` to define your backend API mapping:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## Installation

Install dependencies for the root, frontend, and backend:

```bash
npm install
npm run install:all
```

## Running the Application

To run both the server and the client concurrently in development mode:

```bash
npm run dev
```

- **Frontend Client:** `http://localhost:5173`
- **Backend API:** `http://localhost:5000`

## Build for Production

```bash
npm run build
```

## Features & Endpoints

**Main API Endpoints:**
- `POST /api/auth/register` - Create a new user
- `POST /api/auth/login` - Authenticate a user
- `GET /api/users` - Fetch users to chat with
- `GET /api/conversations` - Get a user's active conversations
- `POST /api/conversations` - Start a new conversation
- `POST /api/conversations/:conversationId/seen` - Mark messages as read
- `GET /api/messages/:conversationId` - Retrieve chat history
- `POST /api/messages` - Send a message

**Real-time Socket.IO Events:**
- `register-user` / `disconnect`
- `join-room`
- `typing` / `stop-typing`
- `receive-message`
- `new-conversation`
