import MessageBubble from "./MessageBubble";

export default function ChatWindow({ title, status, messages }) {
  return (
    <section className="flex h-full w-full flex-col bg-white/70">
      <header className="flex items-center justify-between border-b border-slate-200/70 px-6 py-4">
        <div>
          <p className="text-sm font-semibold text-ink-900">{title}</p>
          <p className="text-xs text-ink-500">{status}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-full border border-slate-200 px-3 py-1 text-xs">
            Call
          </button>
          <button className="rounded-full border border-slate-200 px-3 py-1 text-xs">
            Video
          </button>
        </div>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto px-6 py-6">
        {messages?.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.isOwn}
          />
        ))}
      </div>
    </section>
  );
}
