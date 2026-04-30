import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function JsonViewer({ title, description, value }: { title: string; description: string; value: unknown }) {
  return (
    <Card className="border-white/8 bg-slate-900/80">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <pre className="max-h-80 overflow-auto rounded-2xl bg-black/30 p-4 text-xs leading-6 text-slate-300">
          {JSON.stringify(value, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}
