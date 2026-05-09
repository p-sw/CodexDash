import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function JsonViewer({ title, description, value }: { title: string; description: string; value: unknown }) {
  return (
    <Card className="min-w-0 border-white/8 bg-slate-900/80">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="min-w-0">
        <div className="min-w-0 max-h-80 overflow-x-auto overflow-y-auto rounded-2xl bg-black/30">
          <pre className="min-w-0 whitespace-pre-wrap break-all p-4 text-xs leading-6 text-slate-300">
            {JSON.stringify(value, null, 2)}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
