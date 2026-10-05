'use client';

import { useEffect } from 'react';
import StatusPage from '@/components/StatusPage';
import { Button } from '@/components/ui/button';

export interface ErrorFallbackProps {
  error: Error & { digest?: string };
  retry: () => void;
}





const ErrorFallback = ({ error, retry }: ErrorFallbackProps) => {
  useEffect(() => {
    console.error(error, { digest: error.digest });
  }, [error]);

  const actionButton = (
    <Button
      onClick={() => retry()}
      className="mt-8"
    >
      Intentar de nuevo
    </Button>
  );

  return (
    <StatusPage
      type="genericError"
      actionButton={actionButton}
    />
  );
};

export default ErrorFallback;
