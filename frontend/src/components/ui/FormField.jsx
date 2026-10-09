import { useId } from "react";

export default function FormField({
  label,
  multiline = false,
  optional = false,
  ...props
}) {
  const id = useId();
  const Control = multiline ? "textarea" : "input";
  return (
    <label htmlFor={id} className="block text-xs">
      {label} {optional && <span className="text-stone-400">optional</span>}
      <Control
        id={id}
        className="mt-2 w-full resize-y rounded-lg border border-stone-200 bg-stone-50/60 p-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
        {...props}
      />
    </label>
  );
}
