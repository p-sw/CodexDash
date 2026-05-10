import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-sky-400/60 focus:bg-white/8',
        className,
      )}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export { Input };
