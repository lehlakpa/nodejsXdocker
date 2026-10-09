const variants = {
  primary: "bg-[#214d3c] text-white hover:bg-[#163e2e]",
  secondary: "border border-stone-200 bg-white hover:bg-stone-50",
  danger: "bg-red-700 text-white hover:bg-red-800",
};

export default function Button({
  variant = "primary",
  type = "button",
  className = "",
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-700 disabled:cursor-wait disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
