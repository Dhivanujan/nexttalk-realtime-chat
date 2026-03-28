# NextTalk MERN

This repository has been migrated to a MERN architecture:

- MongoDB + Mongoose
- Express.js API
- React (Vite + TypeScript) frontend
- Node.js + Socket.IO real-time server

## Project Layout

- `server/` Express + Socket.IO + Mongoose backend
- `client/` React frontend
- `package.json` root scripts to run both apps together

## Environment Setup

Create `server/.env` from `server/.env.example`:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/next-talk-mern
JWT_SECRET=change-this-secret
CLIENT_URL=http://localhost:5173
```

Create `client/.env` (optional if using defaults):

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## Install

```bash
npm install
npm run install:all
```

## Run Development

```bash
npm run dev
```

- API server: `http://localhost:5000`
- Client app: `http://localhost:5173`

## Build

```bash
npm run build
```

## Main API Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/users`
- `GET /api/conversations`
- `POST /api/conversations`
- `POST /api/conversations/:conversationId/seen`
- `GET /api/messages/:conversationId`
- `POST /api/messages`

## Socket Events

- `register-user`
- `join-room`
- `typing`
- `stop-typing`
- `receive-message`
- `new-conversation`
