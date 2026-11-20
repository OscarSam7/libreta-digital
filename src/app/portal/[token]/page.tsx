import { Suspense } from 'react';
import { CustomerPortalView } from '@/components/CustomerPortalView';

export const dynamic = 'force-dynamic';

async function PortalContent({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = await params;
  return <CustomerPortalView token={resolvedParams.token} />;
}

export default function Page({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-sm font-medium">Cargando libreta digital...</div>}>
      <PortalContent params={params} />
    </Suspense>
  );
}
