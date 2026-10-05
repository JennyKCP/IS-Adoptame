import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button'; 


interface StatusPageProps {
  type: 'notFound' | 'accessDenied' | 'genericError';
  actionButton?: React.ReactNode;
  itemName?: string;
  redirectUrl?: string;
  buttonGoTo?: string;
}


interface ErrorContent {
  errorCode: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const errorTypeDetails: Record<'notFound' | 'accessDenied' | 'genericError', ErrorContent> = {
  notFound: {
    errorCode: '404',
    title: 'Página no encontrada',
    description:
      "La página que buscas no existe. Es posible que se haya movido, eliminado o que la dirección esté escrita incorrectamente.",
    icon: (
      <Image
        src="/icons/giraffe.svg"
        alt=""
        width={80}
        height={80}
        className="mb-5 sm:mb-6 size-20 sm:size-50"
        priority
      />
    ),
  },
  accessDenied: {
    errorCode: '403',
    title: 'Acceso denegado',
    description:
      'No tienes los permisos necesarios para ver esta página. Si crees que se trata de un error, contacta a un administrador.',
    icon: (
      <Image
        src="/icons/cobra.svg"
        alt=""
        width={80}
        height={80}
        className="mb-5 sm:mb-6 size-20 sm:size-50"
        priority
      />
    ),
  },
  genericError: {
    errorCode: 'Error',
    title: 'Algo salió mal',
    description: "Ocurrió un error inesperado. Actualiza la página o pulsa el botón de abajo para intentarlo de nuevo.",
    icon: (
      <Image
        src="/icons/racoon.svg"
        alt=""
        width={80}
        height={80}
        className="mb-5 sm:mb-6 size-20 sm:size-50"
        priority
      />
    ),
  },
};

const StatusPage = ({ type, actionButton, itemName, redirectUrl, buttonGoTo }: StatusPageProps) => {
  const details = errorTypeDetails[type] || errorTypeDetails.notFound;
  const { errorCode, description, icon } = details;

  const title = type === 'notFound' && itemName ? `No se encontró ${itemName.toLowerCase()}` : details.title;

  
  const defaultActionButton = (
    <Button asChild className="mt-8">
      <Link href={redirectUrl || '/'}>
        {buttonGoTo ? `Volver a ${buttonGoTo}` : 'Ir al inicio'}
      </Link>
    </Button>
  );

  return (
    <div className="flex flex-col items-center justify-center text-center px-4 py-12 sm:py-16 md:py-20">
      {icon}
      <p className="text-sm sm:text-base font-semibold text-primary uppercase tracking-wide">
        {errorCode}
      </p>
      <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-foreground md:text-5xl">
        {title}
      </h1>
      <p className="mt-3 text-base text-muted-foreground max-w-md sm:max-w-lg">
        {description}
      </p>

      {actionButton !== null && (actionButton === undefined ? defaultActionButton : actionButton)}
    </div>
  );
};

export default StatusPage;
