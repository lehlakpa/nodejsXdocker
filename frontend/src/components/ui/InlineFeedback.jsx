export default function InlineFeedback({ message, className = '' }) {
  if (!message) return null;
  return <div role="alert" className={`flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800 ${className}`}><span aria-hidden="true" className="font-bold">!</span><p>{message}</p></div>;
}
