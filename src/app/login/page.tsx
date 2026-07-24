type Props = {
  searchParams: Promise<{ from?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { from, error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">FES · Captación de clientes</h1>
        <p className="mt-1 text-sm text-slate-500">Ingresa la clave de acceso del equipo.</p>

        <form action="/api/auth/login" method="POST" className="mt-6 space-y-4">
          <input type="hidden" name="from" value={from ?? "/"} />
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Clave
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
            />
          </div>

          {error ? (
            <p className="text-sm text-red-600">Clave incorrecta. Intenta de nuevo.</p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
