# Socket Events

## Client -> Server
- register-user { userId }
- join-room { roomId }
- typing { roomId, userId }
- stop-typing { roomId, userId }
- message-delivered { messageId, conversationId }
- message-seen { messageId, conversationId }

## Server -> Client
- online-users [userIds]
- receive-message message
- user-typing { userId }
- user-stop-typing { userId }
- message-status-update { messageId, status, conversationId }
- message-reaction-updated message
- message-deleted { messageId, conversationId, body }
- new-conversation conversation
