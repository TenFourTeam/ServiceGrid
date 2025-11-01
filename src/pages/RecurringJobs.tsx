import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function RecurringJobs() {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to Team page with recurring tab
    navigate('/team?tab=recurring', { replace: true });
  }, [navigate]);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-muted-foreground">Redirecting to Team...</div>
    </div>
  );
}
