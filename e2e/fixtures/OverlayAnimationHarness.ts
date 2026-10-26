import { createElement, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../src/components/shadcn/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../src/components/shadcn/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../src/components/shadcn/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../src/components/shadcn/select';
import {
  Sheet,
  SheetContent,
} from '../../src/components/ui/Sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../src/components/ui/Tooltip';

function OverlayAnimationHarness() {
  const [sheetSide, setSheetSide] = useState<'left' | 'right' | 'bottom' | null>(null);

  return createElement(
    'div',
    null,
    createElement(
      AlertDialog,
      null,
      createElement(AlertDialogTrigger, null, 'Open alert dialog'),
      createElement(
        AlertDialogContent,
        null,
        createElement(AlertDialogTitle, null, 'Alert motion test'),
        createElement(AlertDialogDescription, null, 'Alert description'),
        createElement(AlertDialogAction, null, 'Confirm action'),
      ),
    ),
    ...(['left', 'right', 'bottom'] as const).map((side) =>
      createElement('button', { key: side, onClick: () => setSheetSide(side) }, `Open ${side} sheet`),
    ),
    createElement(
      Sheet,
      { open: sheetSide !== null, onOpenChange: (open) => { if (!open) setSheetSide(null); } },
      createElement(
        SheetContent,
        { side: sheetSide ?? 'left', 'aria-label': 'Sheet motion test' },
        createElement('p', null, 'Sheet content'),
      ),
    ),
    createElement(
      TooltipProvider,
      {
        delayDuration: 0,
        children: createElement(
          Tooltip,
          null,
          createElement(TooltipTrigger, { asChild: true }, createElement('button', null, 'Hover tooltip')),
          createElement(TooltipContent, null, 'Tooltip motion test'),
        ),
      },
    ),
    createElement(
      Select,
      { defaultValue: 'one' },
      createElement(SelectTrigger, null, createElement(SelectValue)),
      createElement(SelectContent, null, createElement(SelectItem, { value: 'one' }, 'Option one')),
    ),
    createElement(
      DropdownMenu,
      null,
      createElement(DropdownMenuTrigger, null, 'Open dropdown'),
      createElement(DropdownMenuContent, null, createElement(DropdownMenuItem, null, 'Dropdown item')),
    ),
    createElement(
      Popover,
      null,
      createElement(PopoverTrigger, null, 'Open popover'),
      createElement(PopoverContent, null, 'Popover motion test'),
    ),
  );
}

export function mountOverlayAnimationHarness() {
  const container = document.createElement('div');
  document.body.append(container);
  createRoot(container).render(createElement(OverlayAnimationHarness));
}
