import { createElement, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '../../src/components/ui/Dialog';

function DialogAnimationHarness() {
  const [open, setOpen] = useState(false);

  return createElement(
    'div',
    null,
    createElement('button', { onClick: () => setOpen(true) }, 'Open dialog'),
    createElement(
      Dialog,
      { open, onOpenChange: setOpen },
      createElement(
        DialogContent,
        null,
        createElement(DialogTitle, null, 'Dialog motion test'),
      ),
    ),
  );
}

export function mountDialogAnimationHarness() {
  const container = document.createElement('div');
  document.body.append(container);
  createRoot(container).render(createElement(DialogAnimationHarness));
}
