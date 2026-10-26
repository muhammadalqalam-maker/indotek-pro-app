import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

type SignaturePadProps = {
  label: string;
  hint: string;
  clearLabel: string;
  savedLabel: string;
  typedNameLabel: string;
  useTypedNameLabel: string;
  processErrorLabel: string;
  disabled?: boolean;
  savedSignatureUrl?: string | null;
  onSignatureChange: (file: File | null) => void;
};

export function SignaturePad({
  label,
  hint,
  clearLabel,
  savedLabel,
  typedNameLabel,
  useTypedNameLabel,
  processErrorLabel,
  disabled = false,
  savedSignatureUrl = null,
  onSignatureChange,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [filePreview, setFilePreview] = useState('');
  const [hasNewSignature, setHasNewSignature] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [processingError, setProcessingError] = useState('');

  useEffect(() => {
    if (!filePreview) return undefined;
    return () => URL.revokeObjectURL(filePreview);
  }, [filePreview]);

  useEffect(() => {
    setFilePreview('');
    setHasNewSignature(false);
    setCleared(false);
    setProcessingError('');
  }, [savedSignatureUrl]);

  const pointFor = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * (canvas.width / bounds.width),
      y: (event.clientY - bounds.top) * (canvas.height / bounds.height),
    };
  };

  const beginStroke = (event: PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = event.currentTarget;
    const context = canvas.getContext('2d');
    if (!context) return;
    const point = pointFor(event);
    canvas.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.lineWidth = 4;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = getComputedStyle(canvas).color;
    setIsDrawing(true);
    setHasNewSignature(true);
    setCleared(false);
  };

  const continueStroke = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const context = event.currentTarget.getContext('2d');
    if (!context) return;
    const point = pointFor(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const saveCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) {
      setProcessingError(processErrorLabel);
      return;
    }
    const file = new File([blob], 'signature.png', { type: 'image/png' });
    setFilePreview(URL.createObjectURL(file));
    setProcessingError('');
    onSignatureChange(file);
  };

  const endStroke = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    void saveCanvas();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    setFilePreview('');
    setHasNewSignature(false);
    setCleared(true);
    setProcessingError('');
    onSignatureChange(null);
  };

  const createTypedSignature = async () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    const name = typedName.trim();
    if (!canvas || !context || !name) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = 'italic 44px serif';
    context.fillText(name.slice(0, 32), 32, 118, canvas.width - 64);
    setHasNewSignature(true);
    setCleared(false);
    await saveCanvas();
  };

  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <div>
        <h3 className="text-sm font-semibold text-text">{label}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
      {!disabled && (
        <div className="space-y-3">
          <canvas
            ref={canvasRef}
            width={720}
            height={200}
            aria-label={label}
            className="h-36 w-full touch-none rounded-md border border-border-strong bg-surface-2 text-text"
            onPointerDown={beginStroke}
            onPointerMove={continueStroke}
            onPointerUp={endStroke}
            onPointerCancel={endStroke}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Input
              label={typedNameLabel}
              value={typedName}
              onChange={(event) => setTypedName(event.currentTarget.value)}
              autoComplete="name"
            />
            <Button variant="outline" onClick={() => void createTypedSignature()} disabled={!typedName.trim()}>
              {useTypedNameLabel}
            </Button>
            <Button variant="ghost" onClick={clear}>{clearLabel}</Button>
          </div>
          {processingError && <p className="text-sm text-danger" role="alert">{processingError}</p>}
        </div>
      )}
      {filePreview && hasNewSignature ? (
        <img src={filePreview} alt={label} className="max-h-24 max-w-full object-contain" />
      ) : savedSignatureUrl && !cleared ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{savedLabel}</p>
          <img src={savedSignatureUrl} alt={label} className="max-h-24 max-w-full object-contain" />
        </div>
      ) : null}
    </section>
  );
}
