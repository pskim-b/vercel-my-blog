type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = searchParams ? await searchParams : {};
  const next = firstParam(params.next) ?? "/";
  const error = firstParam(params.error);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-6 text-3xl font-bold text-white">Sign in</h1>
      <form action="/api/auth/login" method="post" className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <label className="block">
          <span className="mb-2 block text-sm text-gray-400">Access key</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            className="w-full rounded border border-gray-700 bg-black px-3 py-2 text-white outline-none focus:border-cyan-400"
            required
          />
        </label>
        {error && (
          <p className="text-sm text-red-400">Invalid access key.</p>
        )}
        <button
          type="submit"
          className="w-full rounded bg-white px-4 py-2 font-semibold text-black transition-colors hover:bg-gray-200"
        >
          Continue
        </button>
      </form>
    </main>
  );
}
