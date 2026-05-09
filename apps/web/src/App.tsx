import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  AuthResponse,
  CompleteCodexManualLoginInput,
  LoginInput,
  RegisterInput,
  StartCodexLoginInput,
} from '@codexdash/shared-types';
import {
  Activity,
  CirclePlus,
  ExternalLink,
  Gauge,
  Link as LinkIcon,
  LoaderCircle,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Waypoints,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { api } from '@/lib/api';
import { clearToken, getToken, setToken } from '@/lib/storage';
import { flattenNumericMetrics, formatDate, titleizeMetric } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
});

const manualCallbackSchema = z.object({
  callbackUrl: z.string().min(10),
});

function AuthShell({
  onAuthenticated,
}: {
  onAuthenticated: (response: AuthResponse) => void;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const schema = mode === 'register' ? registerSchema : loginSchema;
  const form = useForm<{ name?: string; email: string; password: string }>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      ...(mode === 'register' ? { name: '' } : {}),
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: {
      name?: string;
      email: string;
      password: string;
    }) => {
      return mode === 'register'
        ? api.register(values as RegisterInput)
        : api.login({
            email: values.email,
            password: values.password,
          } as LoginInput);
    },
    onSuccess: (response) => {
      setToken(response.token);
      onAuthenticated(response);
      toast.success(
        mode === 'register'
          ? 'Welcome to CodexDash.'
          : 'Signed in successfully.',
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-8 sm:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden border-sky-500/20 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.92))]">
          <CardContent className="flex h-full flex-col justify-between gap-8 p-6 sm:p-8">
            <div className="space-y-5">
              <Badge className="w-fit border-sky-400/30 bg-sky-400/10 text-sky-100">
                Mobile-first Codex monitor
              </Badge>
              <div className="space-y-4">
                <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  CodexDash keeps every Codex account in one gorgeous live dashboard.
                </h1>
                <p className="max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                  Sign into CodexDash, connect multiple OpenAI Codex accounts through a real login flow, and view combined limits,
                  remaining usage, raw API payloads, and per-account drilldowns from a single responsive UI.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: Gauge,
                  title: 'Unified usage',
                  desc: 'Merge multiple OpenAI accounts into one overview.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Stored safely',
                  desc: 'OAuth session data is encrypted at rest.',
                },
                {
                  icon: Activity,
                  title: 'Live detail',
                  desc: 'See refreshed usage plus raw usage payloads.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-white/6 p-4"
                >
                  <item.icon className="mb-3 size-5 text-sky-300" />
                  <div className="font-medium text-white">{item.title}</div>
                  <div className="mt-1 text-sm leading-6 text-slate-400">
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-950/88">
          <CardHeader>
            <CardTitle>
              {mode === 'register' ? 'Create your account' : 'Welcome back'}
            </CardTitle>
            <CardDescription>
              {mode === 'register'
                ? 'Start with your CodexDash account, then connect OpenAI Codex logins inside the dashboard.'
                : 'Log in to continue monitoring your combined Codex usage.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
            >
              {mode === 'register' ? (
                <div className="space-y-2">
                  <Label htmlFor="name">Display name</Label>
                  <Input
                    id="name"
                    placeholder="Codex operator"
                    {...form.register('name' as const)}
                  />
                  <p className="text-xs text-rose-300">
                    {String(form.formState.errors.name?.message ?? '')}
                  </p>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...form.register('email')}
                />
                <p className="text-xs text-rose-300">
                  {String(form.formState.errors.email?.message ?? '')}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  {...form.register('password')}
                />
                <p className="text-xs text-rose-300">
                  {String(form.formState.errors.password?.message ?? '')}
                </p>
              </div>
              <Button className="w-full" disabled={mutation.isPending} type="submit">
                {mutation.isPending
                  ? 'Please wait…'
                  : mode === 'register'
                    ? 'Create account'
                    : 'Sign in'}
              </Button>
            </form>

            <Separator className="my-6" />

            <div className="space-y-3 text-sm text-slate-400">
              <p>
                OpenAI account connection now uses a real sign-in flow based on the Codex client OAuth pattern.
                After you click connect, CodexDash opens OpenAI login in a popup and can also finish from a pasted callback URL if localhost is unavailable.
              </p>
              <Button
                type="button"
                variant="ghost"
                className="px-0 text-sky-300 hover:bg-transparent"
                onClick={() =>
                  setMode(mode === 'register' ? 'login' : 'register')
                }
              >
                {mode === 'register'
                  ? 'Already have an account? Sign in'
                  : 'Need an account? Register'}
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
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [authorizeUrl, setAuthorizeUrl] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);
  const handledAttemptStatusRef = useRef<string | null>(null);
  const form = useForm<z.infer<typeof connectSchema>>({
    resolver: zodResolver(connectSchema),
    defaultValues: { label: '', emailHint: '' },
  });
  const manualCallbackForm = useForm<z.infer<typeof manualCallbackSchema>>({
    resolver: zodResolver(manualCallbackSchema),
    defaultValues: { callbackUrl: '' },
  });

  const startMutation = useMutation({
    mutationFn: api.startCodexLogin,
    onSuccess: (response) => {
      setAttemptId(response.attemptId);
      setAuthorizeUrl(response.authorizeUrl);
      manualCallbackForm.reset();
      popupRef.current = window.open(
        response.authorizeUrl,
        'codexdash-openai-login',
        'popup=yes,width=520,height=760',
      );
      if (!popupRef.current) {
        toast.error('Popup was blocked. Use the fallback link inside the dialog.');
      } else {
        toast.success('Continue the OpenAI sign-in flow in the popup.');
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const manualCompleteMutation = useMutation({
    mutationFn: ({
      callbackUrl,
      currentAttemptId,
    }: CompleteCodexManualLoginInput & { currentAttemptId: string }) =>
      api.completeCodexManualLogin(currentAttemptId, { callbackUrl }),
    onSuccess: () => {
      toast.success('Processing the pasted OpenAI callback URL…');
      void attemptQuery.refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const attemptQuery = useQuery({
    enabled: Boolean(attemptId),
    queryKey: ['codex-login-attempt', attemptId],
    queryFn: () => api.getCodexLoginAttempt(attemptId as string),
    refetchInterval: (query) =>
      query.state.data?.status === 'pending' ? 2_000 : false,
  });

  const cancelMutation = useMutation({
    mutationFn: api.cancelCodexLoginAttempt,
    onSuccess: () => {
      toast.success('Login attempt cancelled.');
      setAttemptId(null);
      setAuthorizeUrl(null);
      manualCallbackForm.reset();
      popupRef.current?.close();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  useEffect(() => {
    const attempt = attemptQuery.data;
    if (!attempt) {
      return;
    }

    const statusKey = `${attempt.id}:${attempt.status}:${attempt.completedAt ?? ''}:${attempt.lastError ?? ''}`;
    if (handledAttemptStatusRef.current === statusKey) {
      return;
    }

    if (attempt.status === 'completed') {
      handledAttemptStatusRef.current = statusKey;
      window.setTimeout(() => {
        toast.success('OpenAI Codex account connected.');
        setOpen(false);
        setAttemptId(null);
        setAuthorizeUrl(null);
        form.reset();
        manualCallbackForm.reset();
        popupRef.current?.close();
        void queryClient.invalidateQueries({ queryKey: ['usage-summary'] });
      }, 0);
      return;
    }

    if (attempt.status === 'error' || attempt.status === 'expired') {
      handledAttemptStatusRef.current = statusKey;
      toast.error(attempt.lastError || 'OpenAI login failed.');
    }
  }, [attemptQuery.data, form, manualCallbackForm, queryClient]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.data?.type !== 'codexdash:oauth-complete') {
        return;
      }
      if (event.data?.attemptId && event.data.attemptId === attemptId) {
        void attemptQuery.refetch();
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [attemptId, attemptQuery]);

  const attempt = attemptQuery.data;
  const isPendingAttempt = attempt?.status === 'pending';

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next && isPendingAttempt && attemptId) {
          cancelMutation.mutate(attemptId);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <CirclePlus className="size-4" />
          Connect OpenAI account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect an OpenAI Codex account</DialogTitle>
          <DialogDescription>
            Start a real OpenAI sign-in flow. CodexDash opens the official login,
            completes the Codex-style OAuth callback locally, then stores the
            encrypted session for future usage refreshes.
          </DialogDescription>
        </DialogHeader>

        {attemptId ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/8 p-4 text-sm text-slate-300">
              <div className="flex items-center gap-2 font-medium text-white">
                <LoaderCircle className="size-4 animate-spin" />
                Waiting for OpenAI login
              </div>
              <div className="mt-2 leading-6">
                {attempt?.status === 'completed'
                  ? 'The login finished successfully. Closing this dialog…'
                  : 'Finish the sign-in flow in the popup window. CodexDash will detect the callback automatically.'}
              </div>
              <div className="mt-3 text-xs text-slate-400">
                Expires: {formatDate(attempt?.expiresAt ?? null)}
              </div>
            </div>

            {authorizeUrl ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    popupRef.current = window.open(
                      authorizeUrl,
                      'codexdash-openai-login',
                      'popup=yes,width=520,height=760',
                    );
                  }}
                >
                  <ExternalLink className="size-4" />
                  Re-open login popup
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  asChild
                >
                  <a href={authorizeUrl} rel="noreferrer" target="_blank">
                    <LinkIcon className="size-4" />
                    Open login in new tab
                  </a>
                </Button>
              </div>
            ) : null}

            <div className="rounded-2xl border border-white/10 bg-white/4 p-4 text-sm text-slate-300">
              <div className="font-medium text-white">Manual fallback</div>
              <p className="mt-2 leading-6 text-slate-400">
                If localhost:1455 is not listening, OpenAI may finish on a browser error page.
                Copy the full URL from the address bar and paste it below to complete the login manually.
              </p>
              <form
                className="mt-4 space-y-3"
                onSubmit={manualCallbackForm.handleSubmit((values) => {
                  if (!attemptId) {
                    return;
                  }
                  manualCompleteMutation.mutate({
                    callbackUrl: values.callbackUrl,
                    currentAttemptId: attemptId,
                  });
                })}
              >
                <Input
                  placeholder="http://localhost:1455/auth/callback?code=...&state=..."
                  {...manualCallbackForm.register('callbackUrl')}
                />
                <p className="text-xs text-rose-300">
                  {String(
                    manualCallbackForm.formState.errors.callbackUrl?.message ?? '',
                  )}
                </p>
                <Button
                  type="submit"
                  variant="outline"
                  disabled={!attemptId || manualCompleteMutation.isPending}
                >
                  {manualCompleteMutation.isPending
                    ? 'Processing callback…'
                    : 'Complete with pasted URL'}
                </Button>
              </form>
            </div>

            {attempt?.lastError ? (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/8 p-4 text-sm text-rose-200">
                {attempt.lastError}
              </div>
            ) : null}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => void attemptQuery.refetch()}
              >
                <RefreshCw className="size-4" />
                Check status
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={!attemptId || cancelMutation.isPending}
                onClick={() => attemptId && cancelMutation.mutate(attemptId)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <form
            className="mt-5 space-y-4"
            onSubmit={form.handleSubmit((values) =>
              startMutation.mutate(values as StartCodexLoginInput)
            )}
          >
            <div className="space-y-2">
              <Label htmlFor="label">Account label</Label>
              <Input
                id="label"
                placeholder="Primary Team Pro"
                {...form.register('label')}
              />
              <p className="text-xs text-rose-300">
                {String(form.formState.errors.label?.message ?? '')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailHint">Email hint</Label>
              <Input
                id="emailHint"
                placeholder="ops@example.com"
                {...form.register('emailHint')}
              />
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/4 p-4 text-sm leading-6 text-slate-400">
              CodexDash reuses the Codex public-client login shape discovered in
              codex-pool, but presents it as an integrated popup flow with a manual pasted-URL fallback instead of asking you to paste cookies manually.
            </div>
            <Button className="w-full" disabled={startMutation.isPending} type="submit">
              {startMutation.isPending ? 'Preparing login…' : 'Continue to OpenAI'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Dashboard() {
  const queryClient = useQueryClient();
  const summaryQuery = useQuery({
    queryKey: ['usage-summary'],
    queryFn: () => api.getUsageSummary(true),
  });
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
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-300">
        Loading CodexDash…
      </div>
    );
  }

  if (summaryQuery.isError || userQuery.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Unable to load dashboard</CardTitle>
            <CardDescription>
              {(summaryQuery.error as Error | undefined)?.message ??
                (userQuery.error as Error | undefined)?.message}
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
  const progressValue =
    firstMetric + secondMetric > 0
      ? (firstMetric / (firstMetric + secondMetric)) * 100
      : 0;

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Badge className="mb-3 w-fit border-emerald-400/20 bg-emerald-400/10 text-emerald-200">
            Signed in as {user.name}
          </Badge>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">
            CodexDash overview
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            Combined usage is refreshed by calling Codex usage endpoints for each attached OpenAI account and merging numeric fields into one dashboard.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" onClick={() => summaryQuery.refetch()}>
            <RefreshCw className="size-4" />
            Refresh now
          </Button>
          <ConnectAccountDialog />
          <Button
            variant="ghost"
            onClick={() => {
              clearToken();
              window.location.reload();
            }}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)] xl:items-stretch">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Unified capacity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-4xl font-semibold text-white">
                  {firstMetric.toLocaleString()}
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  {titleizeMetric(metricCards[0]?.label ?? 'Primary metric')}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold text-slate-100">
                  {secondMetric.toLocaleString()}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {titleizeMetric(metricCards[1]?.label ?? 'Secondary metric')}
                </div>
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

        <div className="grid gap-4 xl:grid-rows-3">
          {[
            {
              title: 'Connected sessions',
              value: summary.totals.totalAccounts,
              tone: 'text-sky-300',
            },
            {
              title: 'Healthy sessions',
              value: summary.totals.activeAccounts,
              tone: 'text-emerald-300',
            },
            {
              title: 'Errored sessions',
              value: summary.totals.erroredAccounts,
              tone: 'text-rose-300',
            },
          ].map((item) => (
            <Card key={item.title} className="h-full">
              <CardHeader>
                <CardDescription>{item.title}</CardDescription>
                <CardTitle className={item.tone}>
                  {item.value.toLocaleString()}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      <Card className="mt-6 min-w-0">
        <CardHeader>
          <CardTitle>Usage metrics</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          {metricCards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/3 p-6 text-sm text-slate-400">
              No usage data yet. Connect an OpenAI account and complete the sign-in flow to start refreshing.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {metricCards.map((metric) => (
                <div
                  key={metric.label}
                  className="min-w-0 rounded-2xl border border-white/10 bg-white/4 p-4"
                >
                  <div className="text-sm text-slate-400 break-words">
                    {titleizeMetric(metric.label)}
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-white">
                    {metric.value.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Connected OpenAI accounts</CardTitle>
          <CardDescription>Merged by default. Inspect each account below.</CardDescription>
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
                  <TabsTrigger
                    key={account.id}
                    value={account.id}
                    className="border border-white/10 bg-white/5 data-[state=active]:border-sky-400/40 data-[state=active]:bg-slate-900"
                  >
                    {account.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {summary.accounts.map((account) => (
                <TabsContent key={account.id} value={account.id}>
                  <div className="space-y-4 rounded-3xl border border-white/10 bg-white/4 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-lg font-semibold text-white">
                          {account.label}
                        </div>
                        <div className="mt-1 text-sm text-slate-400">
                          {account.providerEmail ||
                            account.emailHint ||
                            'No email available yet'}
                        </div>
                      </div>
                      <Badge
                        className={
                          account.status === 'active'
                            ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                            : 'border-rose-400/20 bg-rose-400/10 text-rose-200'
                        }
                      >
                        {account.status}
                      </Badge>
                    </div>
                    <Separator />
                    <div className="space-y-2 text-sm text-slate-300">
                      <div className="flex items-center gap-2">
                        <Waypoints className="size-4 text-sky-300" />
                        Auth: {account.authType}
                      </div>
                      <div>Plan: {account.planType || 'Unknown'}</div>
                      <div>
                        Provider account:{' '}
                        <span className="text-slate-400">
                          {account.providerAccountId || 'Unknown'}
                        </span>
                      </div>
                      <div>Session expires: {formatDate(account.sessionExpiresAt)}</div>
                      <div>Last synced: {formatDate(account.lastSyncedAt)}</div>
                      <div>Connected: {formatDate(account.createdAt)}</div>
                      <div>
                        Error:{' '}
                        <span className="text-slate-400">
                          {account.lastError || 'None'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => summaryQuery.refetch()}
                      >
                        <RefreshCw className="size-4" />
                        Refresh
                      </Button>
                      <Button
                        variant="destructive"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(account.id)}
                      >
                        <Trash2 className="size-4" />
                        Remove
                      </Button>
                    </div>
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
      {authenticated ? (
        <Dashboard />
      ) : (
        <AuthShell onAuthenticated={() => setAuthenticated(true)} />
      )}
    </div>
  );
}
