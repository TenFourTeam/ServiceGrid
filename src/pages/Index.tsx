import AppLayout from '@/components/Layout/AppLayout';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function Index() {
  const nav = useNavigate();
  useEffect(()=>{ nav('/calendar', { replace: true }); }, []);
  return (
    <AppLayout title="Welcome">
      <section className="text-center">
        <h2 className="text-xl">Redirecting…</h2>
        <p className="text-muted-foreground">Go to <Link to="/calendar" className="underline">Calendar</Link></p>
      </section>
    </AppLayout>
  );
}
