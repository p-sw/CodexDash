import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthResponse, LoginInput, RegisterInput } from '@codexdash/shared-types';
import { Activity, CirclePlus, Gauge, LogOut, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { api } from '@/lib/api';
import { clearToken, getToken, setToken } from '@/lib/storage';
import { flattenNumericMetrics, formatDate, titleizeMetric } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { JsonViewer } from '@/components/json-viewer';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

const connectSchema = z.object({
  label: z.string().min(2),
  emailHint: z.string().optional(),
  cookieHeader: z.string().min(20),
});

function AuthShell({ onAuthenticated }: { onAuthenticated: (response: AuthResponse) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const schema = mode === 'register' ? registerSchema : loginSchema;
  const form = useForm<{ name?: string; email: string; password: string }>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', ...(mode === 'register' ? { name: '' } : {}) },
  });

  const mutation = useMutation({
    mutationFn: async (values: { name?: string; email: string; password: string }) => {
      return mode === 'register'
        ? api.register(values as RegisterInput)
        : api.login({ email: values.email, password: values.password } as LoginInput);
    },
    onSuccess: (response) => {
      setToken(response.token);
      onAuthenticated(response);
      toast.success(mode === 'register' ? 'Welcome to CodexDash.' : 'Signed in successfully.');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-8 sm:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden border-sky-500/20 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.92))]">
          <CardContent className="flex h-full flex-col justify-between gap-8 p-6 sm:p-8">
            <div className="space-y-5">
              <Badge className="w-fit border-sky-400/30 bg-sky-400/10 text-sky-100">Mobile-first Codex monitor</Badge>
              <div className="space-y-4">
                <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  CodexDash keeps every Codex account in one gorgeous live dashboard.
                </h1>
                <p className="max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                  Sign into CodexDash, attach multiple OpenAI Codex sessions, and view combined limits,
                  remaining usage, raw API payloads, and per-account drilldowns from a single responsive UI.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { icon: Gauge, title: 'Unified usage', desc: 'Merge multiple OpenAI accounts into one overview.' },
                { icon: ShieldCheck, title: 'Stored safely', desc: 'Session cookie headers are encrypted at rest.' },
                { icon: Activity, title: 'Live detail', desc: 'See refreshed usage plus raw usage payloads.' },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/6 p-4">
                  <item.icon className="mb-3 size-5 text-sky-300" />
                  <div className="font-medium text-white">{item.title}</div>
                  <div className="mt-1 text-sm leading-6 text-slate-400">{item.desc}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-950/88">
          <CardHeader>
            <CardTitle>{mode === 'register' ? 'Create your account' : 'Welcome back'}</CardTitle>
            <CardDescription>
              {mode === 'register'
                ? 'Start with your CodexDash account, then connect OpenAI Codex sessions inside the dashboard.'
                : 'Log in to continue monitoring your combined Codex usage.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
              {mode === 'register' ? (
                <div className="space-y-2">
                  <Label htmlFor="name">Display name</Label>
                  <Input id="name" placeholder="Codex operator" {...form.register('name' as const)} />
                  <p className="text-xs text-rose-300">{String(form.formState.errors.name?.message ?? '')}</p>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" {...form.register('email')} />
                <p className="text-xs text-rose-300">{String(form.formState.errors.email?.message ?? '')}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="At least 8 characters" {...form.register('password')} />
                <p className="text-xs text-rose-300">{String(form.formState.errors.password?.message ?? '')}</p>
              </div>
              <Button className="w-full" disabled={mutation.isPending} type="submit">
                {mutation.isPending ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in'}
              </Button>
            </form>

            <Separator className="my-6" />

            <div className="space-y-3 text-sm text-slate-400">
              <p>
                OpenAI account connection is implemented as a session-based Codex login: after signing into
                chatgpt.com in your browser, paste the authenticated <code className="rounded bg-white/10 px-1.5 py-0.5 text-slate-200">Cookie</code>{' '}
                header into the connect flow.
              </p>
              <Button type="button" variant="ghost" className="px-0 text-sky-300 hover:bg-transparent" onClick={() => setMode(mode === 'register' ? 'login' : 'register')}>
                {mode === 'register' ? 'Already have an account? Sign in' : 'Need an account? Register'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ConnectAccountDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const form = useForm<z.infer<typeof connectSchema>>({
    resolver: zodResolver(connectSchema),
    defaultValues: { label: '', emailHint: '', cookieHeader: '' },
  });

  const mutation = useMutation({
    mutationFn: api.connectAccount,
    onSuccess: () => {
      toast.success('OpenAI Codex session connected.');
      setOpen(false);
      form.reset();
      void queryClient.invalidateQueries({ queryKey: ['usage-summary'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <CirclePlus className="size-4" />
          Connect OpenAI account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect an OpenAI Codex session</DialogTitle>
          <DialogDescription>
            Paste the authenticated <code className="rounded bg-white/10 px-1 py-0.5 text-slate-200">Cookie</code>{' '}
            header from a signed-in <code className="rounded bg-white/10 px-1 py-0.5 text-slate-200">chatgpt.com</code>{' '}
            session. CodexDash will use it to call the official usage endpoint.
          </DialogDescription>
        </DialogHeader>
        <form className="mt-5 space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <div className="space-y-2">
            <Label htmlFor="label">Account label</Label>
            <Input id="label" placeholder="Primary Team Pro" {...form.register('label')} />
            <p className="text-xs text-rose-300">{String(form.formState.errors.label?.message ?? '')}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="emailHint">Email hint</Label>
            <Input id="emailHint" placeholder="ops@example.com" {...form.register('emailHint')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cookieHeader">Cookie header</Label>
            <textarea
              id="cookieHeader"
              className="min-h-36 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white outline-none focus:border-sky-400/60"
              placeholder="__Secure-next-auth.session-token=...; oai-did=..."
              {...form.register('cookieHeader')}
            />
            <p className="text-xs text-rose-300">{String(form.formState.errors.cookieHeader?.message ?? '')}</p>
          </div>
          <Button className="w-full" disabled={mutation.isPending} type="submit">
            {mutation.isPending ? 'Connecting…' : 'Validate and connect'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Dashboard() {
  const queryClient = useQueryClient();
  const summaryQuery = useQuery({ queryKey: ['usage-summary'], queryFn: () => api.getUsageSummary(true) });
  const userQuery = useQuery({ queryKey: ['me'], queryFn: api.me });
  const deleteMutation = useMutation({
    mutationFn: api.deleteAccount,
    onSuccess: () => {
      toast.success('OpenAI account removed.');
      void queryClient.invalidateQueries({ queryKey: ['usage-summary'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const metricCards = useMemo(() => {
    return flattenNumericMetrics(summaryQuery.data?.aggregatedUsage).slice(0, 6);
  }, [summaryQuery.data?.aggregatedUsage]);

  if (summaryQuery.isLoading || userQuery.isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-300">Loading CodexDash…</div>;
  }

  if (summaryQuery.isError || userQuery.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Unable to load dashboard</CardTitle>
            <CardDescription>
              {(summaryQuery.error as Error | undefined)?.message ?? (userQuery.error as Error | undefined)?.message}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const summary = summaryQuery.data!;
  const user = userQuery.data!;
  const firstMetric = metricCards[0]?.value ?? 0;
  const secondMetric = metricCards[1]?.value ?? 0;
  const progressValue = firstMetric + secondMetric > 0 ? (firstMetric / (firstMetric + secondMetric)) * 100 : 0;

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Badge className="mb-3 w-fit border-emerald-400/20 bg-emerald-400/10 text-emerald-200">Signed in as {user.name}</Badge>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">CodexDash overview</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            Combined usage is refreshed by calling <code className="rounded bg-white/10 px-1.5 py-0.5 text-slate-200">chatgpt.com/backend-api/api/codex/usage</code>{' '}
            for each attached OpenAI account and merging numeric fields into one dashboard.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" onClick={() => summaryQuery.refetch()}>
            <RefreshCw className="size-4" />
            Refresh now
          </Button>
          <ConnectAccountDialog />
          <Button variant="ghost" onClick={() => { clearToken(); window.location.reload(); }}>
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Unified capacity</CardTitle>
            <CardDescription>Fast glance card for the first two numeric metrics extracted from the merged usage payload.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-4xl font-semibold text-white">{firstMetric.toLocaleString()}</div>
                <div className="mt-1 text-sm text-slate-400">{titleizeMetric(metricCards[0]?.label ?? 'Primary metric')}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold text-slate-100">{secondMetric.toLocaleString()}</div>
                <div className="mt-1 text-sm text-slate-500">{titleizeMetric(metricCards[1]?.label ?? 'Secondary metric')}</div>
              </div>
            </div>
            <Progress value={progressValue} />
            <div className="flex flex-wrap gap-3 text-sm text-slate-400">
              <span>Accounts: {summary.totals.totalAccounts}</span>
              <span>Healthy: {summary.totals.activeAccounts}</span>
              <span>Errors: {summary.totals.erroredAccounts}</span>
              <span>Updated: {formatDate(summary.refreshedAt)}</span>
            </div>
          </CardContent>
        </Card>

        {[
          { title: 'Connected sessions', value: summary.totals.totalAccounts, tone: 'text-sky-300' },
          { title: 'Healthy sessions', value: summary.totals.activeAccounts, tone: 'text-emerald-300' },
          { title: 'Errored sessions', value: summary.totals.erroredAccounts, tone: 'text-rose-300' },
        ].map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardDescription>{item.title}</CardDescription>
              <CardTitle className={item.tone}>{item.value.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Usage metrics</CardTitle>
            <CardDescription>CodexDash extracts numeric leaf nodes from the aggregated usage payload for quick overview cards.</CardDescription>
          </CardHeader>
          <CardContent>
            {metricCards.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/3 p-6 text-sm text-slate-400">
                No usage data yet. Connect an OpenAI account with a valid ChatGPT session cookie header to start refreshing.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {metricCards.map((metric) => (
                  <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/4 p-4">
                    <div className="text-sm text-slate-400">{titleizeMetric(metric.label)}</div>
                    <div className="mt-3 text-2xl font-semibold text-white">{metric.value.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <JsonViewer
          title="Merged payload"
          description="Raw aggregated JSON merged from every attached OpenAI Codex account."
          value={summary.aggregatedUsage ?? { message: 'No data yet' }}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Connected OpenAI accounts</CardTitle>
          <CardDescription>
            By default, these accounts are merged into one Codex usage view. Switch tabs to inspect individual account payloads and timestamps.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summary.accounts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/3 p-6 text-sm text-slate-400">
              No OpenAI accounts connected yet.
            </div>
          ) : (
            <Tabs defaultValue={summary.accounts[0]?.id}>
              <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
                {summary.accounts.map((account) => (
                  <TabsTrigger key={account.id} value={account.id} className="border border-white/10 bg-white/5 data-[state=active]:border-sky-400/40 data-[state=active]:bg-slate-900">
                    {account.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {summary.accounts.map((account) => (
                <TabsContent key={account.id} value={account.id}>
                  <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-4 rounded-3xl border border-white/10 bg-white/4 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-lg font-semibold text-white">{account.label}</div>
                          <div className="mt-1 text-sm text-slate-400">{account.emailHint || 'No email hint provided'}</div>
                        </div>
                        <Badge className={account.status === 'active' ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' : 'border-rose-400/20 bg-rose-400/10 text-rose-200'}>
                          {account.status}
                        </Badge>
                      </div>
                      <Separator />
                      <div className="space-y-2 text-sm text-slate-300">
                        <div>Last synced: {formatDate(account.lastSyncedAt)}</div>
                        <div>Connected: {formatDate(account.createdAt)}</div>
                        <div>
                          Error: <span className="text-slate-400">{account.lastError || 'None'}</span>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => summaryQuery.refetch()}>
                          <RefreshCw className="size-4" />
                          Refresh
                        </Button>
                        <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(account.id)}>
                          <Trash2 className="size-4" />
                          Remove
                        </Button>
                      </div>
                    </div>
                    <JsonViewer
                      title="Account payload"
                      description="Most recent raw usage JSON for this specific OpenAI Codex account."
                      value={account.usage ?? { message: account.lastError || 'No usage fetched yet' }}
                    />
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(Boolean(getToken()));

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_25%),linear-gradient(180deg,#020617_0%,#0f172a_48%,#020617_100%)] text-slate-100">
      <Toaster richColors position="top-center" theme="dark" />
      {authenticated ? <Dashboard /> : <AuthShell onAuthenticated={() => setAuthenticated(true)} />}
    </div>
  );
}
