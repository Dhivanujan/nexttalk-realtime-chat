export default function MessageBubble({ message, isOwn }) {
  return (
    <div
      className={`flex w-full ${isOwn ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
          isOwn
            ? "bg-brand-500 text-white"
            : "bg-white text-ink-900 border border-slate-200"
        }`}
      >
        <p className="leading-relaxed">{message.text}</p>
        <div className="mt-2 flex items-center justify-end gap-2 text-[10px] opacity-70">
          <span>{message.time}</span>
          {isOwn && <span>{message.status}</span>}
        </div>
      </div>
    </div>
  );
}
