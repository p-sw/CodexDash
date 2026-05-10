import * as React from 'react';
import { cn } from '@/lib/utils';

const Label = React.forwardRef<HTMLLabelElement, React.ComponentProps<'label'>>(({ className, ...props }, ref) => {
  return <label ref={ref} className={cn('text-sm font-medium text-slate-200', className)} {...props} />;
});

Label.displayName = 'Label';

export { Label };
