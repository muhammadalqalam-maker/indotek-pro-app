import { useEffect } from 'react';
import { commonMessages } from '../../i18n/id';
import { useToast } from '../ui/Toast';

const messages = commonMessages;
const notificationCooldownMs = 3000;

export function UnhandledErrorNotifications() {
  const { toast } = useToast();

  useEffect(() => {
    let lastNotificationAt = 0;
    const notify = () => {
      const now = Date.now();
      if (now - lastNotificationAt < notificationCooldownMs) return;
      lastNotificationAt = now;

      toast({
        title: messages.unexpectedErrorTitle,
        description: messages.unexpectedErrorDescription,
        variant: 'error',
        action: {
          label: messages.reloadApp,
          onClick: () => window.location.reload(),
        },
      });
    };

    window.addEventListener('error', notify);
    window.addEventListener('unhandledrejection', notify);
    return () => {
      window.removeEventListener('error', notify);
      window.removeEventListener('unhandledrejection', notify);
    };
  }, [toast]);

  return null;
}
