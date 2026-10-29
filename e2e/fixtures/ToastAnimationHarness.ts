import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { ToastProvider, useToast } from '../../src/components/ui/Toast';

function ToastAnimationTrigger() {
  const { toast } = useToast();

  return createElement(
    'button',
    { type: 'button', onClick: () => toast({ title: 'Toast motion test', variant: 'success' }) },
    'Show toast',
  );
}

export function mountToastAnimationHarness() {
  const container = document.createElement('div');
  document.body.append(container);
  createRoot(container).render(
    createElement(ToastProvider, null, createElement(ToastAnimationTrigger)),
  );
}
