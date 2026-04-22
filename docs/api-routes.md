# API Routes

## Auth
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

## Users
- GET /api/users
- GET /api/users/search?query=
- GET /api/users/contacts
- POST /api/users/contacts { contactId | email }
- DELETE /api/users/contacts/:contactId
- PUT /api/users/profile
- POST /api/users/push/subscribe

## Conversations
- GET /api/conversations
- POST /api/conversations
- POST /api/conversations/:conversationId/seen
- GET /api/conversations/:conversationId/pins
- POST /api/conversations/:conversationId/pin
- DELETE /api/conversations/:conversationId/pin/:messageId
- GET /api/conversations/:conversationId/channel-settings
- PATCH /api/conversations/:conversationId/channel-settings
- GET /api/conversations/:conversationId/channel-audit

## Messages
- GET /api/messages/:conversationId?limit=&cursor=
- POST /api/messages
- POST /api/messages/:messageId/reactions
- DELETE /api/messages/:messageId

## Uploads
- POST /api/upload
- GET /uploads/:filename
- GET /stickers/:filename
