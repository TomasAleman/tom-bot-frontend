export function Label({ children, htmlFor, hint }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
      {children}
      {hint ? <span className="ml-1 text-xs text-slate-400">({hint})</span> : null}
    </label>
  );
}

export function Input({ className = '', ...props }) {
  return (
    <input
      {...props}
      className={`block w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base shadow-sm
        focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900
        disabled:bg-slate-100 disabled:text-slate-500 ${className}`}
    />
  );
}

export function Select({ className = '', children, ...props }) {
  return (
    <select
      {...props}
      className={`block w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base shadow-sm
        focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 ${className}`}
    >
      {children}
    </select>
  );
}

export function Button({ variant = 'primary', className = '', type = 'button', ...props }) {
  const styles = {
    primary:   'bg-slate-900 text-white hover:bg-slate-800',
    secondary: 'bg-white text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50',
    danger:    'bg-rose-600 text-white hover:bg-rose-700',
    warning:   'bg-amber-500 text-white hover:bg-amber-600',
    ghost:     'bg-transparent text-slate-700 hover:bg-slate-100',
  }[variant];
  return (
    <button
      type={type}
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium
        transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    />
  );
}

export function ErrorText({ children }) {
  if (!children) return null;
  return <p className="mt-2 text-sm text-rose-600">{children}</p>;
}
