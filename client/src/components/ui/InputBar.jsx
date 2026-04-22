export default function InputBar({ value, onChange, onSend }) {
  return (
    <form
      className="flex items-center gap-3 border-t border-slate-200/70 bg-white/80 px-6 py-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSend?.();
      }}
    >
      <button type="button" className="text-xl">😊</button>
      <input
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder="Type a message"
        className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-ink-700 focus:border-brand-500 focus:outline-none"
      />
      <button type="button" className="text-xl">📎</button>
      <button type="button" className="text-xl">🎤</button>
      <button
        type="submit"
        className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-glow"
      >
        Send
      </button>
    </form>
  );
}
