# NextTalk - WhatsApp Clone

A full-stack WhatsApp clone built with Next.js 14, TypeScript, Tailwind CSS, MongoDB, and Socket.io.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Shadcn UI
- **Database:** MongoDB + Mongoose
- **Authentication:** NextAuth.js (Google + Credentials)
- **Real-time:** Socket.io (Custom Server)
- **State Management:** Redux Toolkit + React Query
- **Validation:** Zod + React Hook Form
- **Uploads:** Cloudinary

## Features

- Real-time Messaging (Socket.io)
- Authentication (Login/Register/Google)
- User Search & Profile
- Group Chats & 1:1 Chats
- Online/Offline Status
- Message Read Receipts (Ticks)
- Infinite Scroll
- Responsive UI similar to WhatsApp Web

## Environment Variables

Create a `.env.local` file in the root directory:

```bash
DATABASE_URL="mongodb+srv://..."
NEXTAUTH_SECRET="your_secret"
NEXTAUTH_URL="http://localhost:3000"

# Optional for Google Auth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Optional for Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=""
```

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Database Seeding

To add dummy users:

```bash
npx ts-node scripts/seed.ts
```

### 3. Start Development Server

Ideally, run the custom server for Socket.io support.

For local development (Next.js + Socket.io custom server):

```bash
npx ts-node server.ts
```

Visit `http://localhost:3000`

## Project Structure

- `app/` - Next.js app directory (routes, layouts)
- `components/` - Reusable UI components
  - `chat/` - Chat specific components
  - `sidebar/` - Sidebar navigation
  - `ui/` - Shadcn UI components
- `lib/` - Utility libraries (db, socket, store)
- `models/` - Mongoose models
- `hooks/` - Custom React hooks
- `actions/` - Server actions for data fetching
- `scripts/` - Utility scripts (seed)

## Deployment

1. Set environment variables on Vercel.
2. Deployment to Vercel supports Next.js app features, but specialized WebSocket support requires separate hosting for `server.ts` or using Pusher instead of Socket.io.
3. For full clonability on Vercel, consider switching real-time provider to Pusher in `app/lib/socket.ts`.

## Future Improvements

- Fully implement Group Chat creation modal
- Add file attachments beyond images
- Optimize image loading with Next.js Image
- Add Push Notifications
- Add End-to-End Tests with Playwright

---

Built with ❤️ by Dhivanujan
