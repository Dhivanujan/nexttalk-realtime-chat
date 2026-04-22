# Implementation Checklist (End-to-End)

## 1) Authentication (Email or Phone + Password)
- [ ] Add `phone` field to user schema with normalization and unique index.
- [ ] Update register endpoint to accept `email` or `phone` (require at least one).
- [ ] Enforce password policy (min length, complexity) on server.
- [ ] Hash password with `bcrypt` using 10-12 rounds.
- [ ] Create JWT with `userId` and expiry (7d recommended).
- [ ] Store JWT in `httpOnly` cookie with `sameSite=strict`.
- [ ] Implement `requireAuth` middleware (cookie + optional `Authorization` header).
- [ ] Add `/auth/me` endpoint to hydrate the client session.
- [ ] Add rate-limiting to `/auth/login` and `/auth/register`.
- [ ] Add client-side forms for register/login (email or phone).
- [ ] Wire AuthContext to persist session and logout.
- [ ] Add logout endpoint to clear cookie.
- [ ] Test: invalid credentials, token expiry, missing token.

## 2) User Profile + Presence
- [ ] Store `name`, `bio`, `image`, `isOnline`, `lastSeen` in user model.
- [ ] Add profile update endpoint (`PUT /users/profile`).
- [ ] Allow avatar upload (local or cloud) and persist URL.
- [ ] Update user profile UI to edit name, bio, avatar.
- [ ] Socket: `register-user` updates `isOnline=true`, `lastSeen=now`.
- [ ] Socket: disconnect updates `isOnline=false`, `lastSeen=now`.
- [ ] Expose `isOnline` + `lastSeen` in user population (conversations + search).
- [ ] Display "Online" or "Last seen" in chat header.
- [ ] Test: open/close tab updates presence.

## 3) Contacts System
- [ ] Store contacts as `[ObjectId]` in user schema.
- [ ] Implement `GET /users/search?query=` for user discovery.
- [ ] Implement `POST /users/contacts { contactId | email }`.
- [ ] Prevent adding self or duplicates.
- [ ] Implement `GET /users/contacts` to populate list.
- [ ] Implement `DELETE /users/contacts/:id`.
- [ ] UI: contact search + add flow.
- [ ] UI: display contacts list in sidebar.
- [ ] Test: add, remove, duplicate, unknown user.

## 4) Real-Time Chat (1:1) + Typing + Read Receipts
- [ ] Create `Conversation` schema (direct) with `users`, `lastMessage`.
- [ ] Create `Message` schema with `body`, `senderId`, `seenIds`, `status`.
- [ ] Implement `POST /conversations` (re-use existing direct if any).
- [ ] Implement `GET /conversations` sorted by `updatedAt`.
- [ ] Implement `POST /messages` to create message.
- [ ] Implement `GET /messages/:conversationId` with pagination cursor.
- [ ] Socket: `join-room` per conversation.
- [ ] Socket: `receive-message` when message is created.
- [ ] Typing: emit `typing` / `stop-typing` and display UI indicator.
- [ ] Read receipts: on open conversation, call `/conversations/:id/seen`.
- [ ] Emit `message-status-update` for delivered/seen.
- [ ] UI: render status ticks for own messages.
- [ ] Test: pagination, unseen count, typing in active room.

## 5) Media Sharing + Voice
- [ ] Add `image`, `video`, `audio` fields to messages.
- [ ] Implement `POST /upload` using `multer` (local or cloud).
- [ ] Validate file types and size.
- [ ] Upload to Cloudinary/S3 and store URL in DB.
- [ ] Message composer: image/video attach.
- [ ] Voice: `MediaRecorder` -> upload audio blob -> store URL.
- [ ] Render media previews in message bubbles.
- [ ] Test: invalid file types, large files, playback.

## 6) Notifications
- [ ] Socket: show toast or sound on `receive-message`.
- [ ] Store unread counts per conversation in UI state.
- [ ] Optional: Service Worker + Push subscription.
- [ ] Store `pushSubscription` on user profile.
- [ ] Server: send push notification to other users on message create.
- [ ] Test: background tab, offline notification, badge count.

## 7) Sidebar Chat List
- [ ] Fetch conversations sorted by `updatedAt` with `lastMessage`.
- [ ] Compute unread count with query filtering.
- [ ] UI: show avatar, name, last preview, timestamp.
- [ ] UI: show unread badge.
- [ ] UI: conversation search input.
- [ ] Test: new message bumps conversation to top.

## 8) UI/UX Behavior
- [ ] Align own messages right, others left.
- [ ] Style message bubbles with rounded corners.
- [ ] Add timestamps to each bubble.
- [ ] Add status ticks for own messages.
- [ ] Scroll behavior: auto-scroll only if near bottom.
- [ ] Add pinned messages rail (optional).
- [ ] Test: long messages, media, scroll restore.

## 9) Dark Mode
- [ ] Implement theme toggle (light/dark).
- [ ] Use CSS variables or Tailwind `dark` variants.
- [ ] Persist theme in `localStorage`.
- [ ] Ensure readable contrast in both themes.
- [ ] Test: refresh keeps theme.

## 10) Responsive Design
- [ ] Desktop: 30/70 split.
- [ ] Mobile: sidebar and chat as separate screens.
- [ ] Add back button for mobile navigation.
- [ ] Test: swipe/back behavior, keyboard overlay.

## 11) Frontend Component Structure
- [ ] Create `Sidebar`, `ChatWindow`, `MessageBubble`, `MessageInput`, `Navbar`.
- [ ] Extract stateful logic into hooks/context.
- [ ] Use Context for auth and chat session.
- [ ] Add API abstraction for server calls.
- [ ] Test: component props minimal and reusable.

## 12) API Design
- [ ] Auth endpoints: register/login/logout/me.
- [ ] Users: search, contacts, profile update.
- [ ] Conversations: list, create, seen, pins.
- [ ] Messages: list, create, delete, reactions.
- [ ] Upload: media endpoint.
- [ ] Add consistent error payloads and status codes.

## 13) WebSocket Events
- [ ] Define events: `register-user`, `join-room`, `typing`, `stop-typing`.
- [ ] Define events: `receive-message`, `message-status-update`.
- [ ] Document payload shapes in a shared constants file.
- [ ] Handle disconnect cleanup.
- [ ] Test: multi-tab and reconnect behavior.

## 14) Database Design + Indexing
- [ ] User: `email`, `phone`, `contacts`, `presence`.
- [ ] Conversation: `users`, `lastMessage`, `updatedAt` index.
- [ ] Message: `conversationId`, `createdAt`, `status` index.
- [ ] Add indexes: `Conversation.users + updatedAt`, `Message.conversationId + createdAt`.
- [ ] Validate references and cascading deletes (optional).

## 15) Deployment
- [ ] Frontend: Vercel/Netlify with env vars for API and Socket.
- [ ] Backend: Render/Railway with env vars for DB + JWT.
- [ ] MongoDB Atlas: create cluster, user, IP whitelist.
- [ ] Configure CORS with allowed client URL.
- [ ] Enable HTTPS, secure cookies in production.
- [ ] Test: login, real-time chat, uploads on production.
