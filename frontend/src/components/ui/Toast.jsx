export default function Toast({ message }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-lg bg-[#214d3c] px-6 py-3 text-xs text-white shadow-xl"
    >
      {message}
    </div>
  );
}
