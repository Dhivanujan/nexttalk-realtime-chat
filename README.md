# NextTalk - Modern Real-Time Chat Application

A high-performance, full-stack real-time chat application built with Next.js 14, TypeScript, Tailwind CSS, MongoDB, and Socket.io. Featuring a modern, responsive UI with dark mode support and seamless real-time messaging.

## 🚀 Key Features

*   **Real-time Messaging:** Instant message delivery powered by a custom Socket.io server.
*   **Modern UI/UX:** A professionally designed interface with a polished indigo/slate theme, glassmorphism effects, and smooth animations.
*   **Authentication:** Secure login via NextAuth.js (Google OAuth + Credentials).
*   **Group & 1:1 Chats:** Create private conversations or group chats with multiple members.
*   **Active Status:** Real-time online/offline status indicators for users.
*   **Read Receipts:** See who has read your messages in real-time.
*   **Rich Media:** Image sharing support using Cloudinary.
*   **Responsive Design:** Fully optimized for desktop, tablet, and mobile devices.
*   **Dark Mode:** Built-in dark mode support for a comfortable viewing experience.

## 🛠 Tech Stack

*   **Framework:** Next.js 14 (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS + Shadcn UI + Lucide Icons
*   **Database:** MongoDB + Mongoose
*   **Authentication:** NextAuth.js
*   **Real-time:** Socket.io (Custom Server)
*   **State Management:** Redux Toolkit + React Query
*   **Validation:** Zod + React Hook Form

## ⚙️ Environment Variables

Create a `.env.local` file in the root directory and add the following:

```env
DATABASE_URL="mongodb+srv://<your-mongodb-connection-string>"
NEXTAUTH_SECRET="your_nextauth_secret"
NEXTAUTH_URL="http://localhost:3000"

# Google Auth (Optional)
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

# Cloudinary (Optional, for image uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your_cloudinary_cloud_name"
```

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Seeding (Optional)

Populate the database with dummy users for testing:

```bash
npm run seed
```

### 3. Run Development Server

The application uses a custom server to handle Socket.io connections. Use the standard dev command, which has been configured to run `server.ts`:

```bash
npm run dev
```

Visit `http://localhost:3000` to see the application in action.

## 📂 Project Structure

*   `app/` - Next.js App Router directory (pages, layouts, API routes).
*   `components/` - Reusable UI components.
    *   `chat/` - Chat-specific components (Header, Body, Input).
    *   `sidebar/` - Sidebar navigation and user lists.
    *   `modals/` - Modal components (Group Chat, etc.).
    *   `ui/` - Shadcn UI components.
*   `lib/` - core utilities (db connection, auth options, socket client).
*   `models/` - Mongoose data models (User, Conversation, Message).
*   `hooks/` - Custom React hooks (useRoutes, useOtherUser, useActiveList).
*   `actions/` - Server actions for data fetching.
*   `server.ts` - Custom Node.js server for Socket.io integration.

## 🔧 Recent Improvements

*   **Fixed Real-Time Connectivity:** Resolved issues where users were not correctly joining socket rooms, ensuring reliable message delivery.
*   **Enhanced UI:** Upgraded the visual design with a modern color palette, improved typography, and glassmorphism headers.
*   **Type Safety:** Fixed numerous TypeScript errors to ensure a robust and stable codebase.
*   **Performance:** Optimized component rendering and state management for a smoother user experience.

## 📦 Deployment

This project uses a custom server (`server.ts`) for WebSockets. When deploying to platforms like Vercel, serverless functions typically do not support long-running WebSocket connections.

**Recommended Deployment:**
*   **VPS / DigitalOcean / Heroku / Railway:** Deploy as a standard Node.js application (`npm run start`).
*   **Vercel:** Supports the Next.js app but may require a separate service for the WebSocket server (or refactoring to use a service like Pusher, though Socket.io is currently implemented for better control).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ using Next.js and Socket.io.
