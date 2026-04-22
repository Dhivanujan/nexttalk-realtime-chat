# Database Schema (MongoDB)

## User
- name: String
- email: String (unique)
- phone: String (unique)
- password: String (bcrypt)
- image: String
- bio: String
- isOnline: Boolean
- lastSeen: Date
- contacts: [User]
- pushSubscription: Mixed

## Conversation
- name: String
- type: direct | group | channel
- isGroup: Boolean
- description: String
- image: String
- isReadOnly: Boolean
- users: [User]
- messagesIds: [Message]
- lastMessage: Message
- pinnedMessageIds: [Message]
- channelOwnerId: User
- channelAdminIds: [User]
- channelAudit: [{ action, actorId, targetId, meta, createdAt }]

## Message
- body: String
- image: String
- video: String
- audio: String
- sticker: String
- conversationId: Conversation
- senderId: User
- seenIds: [User]
- status: sent | delivered | read
- isDeleted: Boolean
- reactions: [{ emoji, userIds }]
