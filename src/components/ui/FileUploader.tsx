import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { FileImage, FileText, LoaderCircle, Trash2, UploadCloud } from 'lucide-react';
import { cn } from './utils';

export type FileUploadStatus = 'idle' | 'uploading' | 'queued' | 'error';

type FileUploaderProps = {
  files: File[];
  onFilesChange: (files: File[]) => void;
  accept?: string;
  acceptedMimeTypes?: string[];
  maxFileSizeBytes?: number;
  maxFiles?: number;
  multiple?: boolean;
  disabled?: boolean;
  compressImages?: boolean;
  maxImageDimension?: number;
  imageQuality?: number;
  uploadStatus?: FileUploadStatus;
  uploadProgress?: number;
  label?: string;
  hint?: string;
  className?: string;
};

const DEFAULT_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

async function compressImage(file: File, maxDimension: number, quality: number): Promise<File> {
  if (!('createImageBitmap' in window)) {
    throw new Error('Browser ini tidak mendukung pemrosesan gambar.');
  }
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Browser tidak dapat memproses gambar.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error('Gambar gagal dikompres.'));
      }, 'image/webp', quality);
    });
    if (blob.size >= file.size) return file;
    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.webp`, {
      type: 'image/webp',
      lastModified: file.lastModified,
    });
  } finally {
    bitmap.close();
  }
}

function formatFileSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

export function FileUploader({
  files,
  onFilesChange,
  accept = 'image/jpeg,image/png,image/webp,application/pdf',
  acceptedMimeTypes = DEFAULT_ACCEPTED_TYPES,
  maxFileSizeBytes = 10 * 1024 * 1024,
  maxFiles = 10,
  multiple = true,
  disabled = false,
  compressImages = true,
  maxImageDimension = 1920,
  imageQuality = 0.82,
  uploadStatus = 'idle',
  uploadProgress,
  label = 'Unggah berkas',
  hint,
  className,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [previews, setPreviews] = useState<Map<File, string>>(new Map());

  useEffect(() => {
    const nextPreviews = new Map<File, string>();
    for (const file of files) {
      if (file.type.startsWith('image/')) nextPreviews.set(file, URL.createObjectURL(file));
    }
    setPreviews(nextPreviews);
    return () => {
      for (const url of nextPreviews.values()) URL.revokeObjectURL(url);
    };
  }, [files]);

  const addFiles = async (selectedFiles: FileList | File[]) => {
    setErrors([]);
    setIsProcessing(true);
    const additions: File[] = [];
    const nextErrors: string[] = [];
    const availableCount = Math.max(0, maxFiles - files.length);
    const candidates = Array.from(selectedFiles);

    try {
      for (const candidate of candidates) {
        if (!multiple && files.length + additions.length >= 1) {
          nextErrors.push('Pilih satu berkas saja.');
          break;
        }
        if (files.length + additions.length >= maxFiles || additions.length >= availableCount) {
          nextErrors.push(`Maksimal ${maxFiles} berkas dapat dipilih.`);
          break;
        }
        if (!acceptedMimeTypes.includes(candidate.type)) {
          nextErrors.push(`${candidate.name}: tipe berkas tidak didukung.`);
          continue;
        }
        if (candidate.size > maxFileSizeBytes) {
          nextErrors.push(`${candidate.name}: ukuran berkas melebihi ${formatFileSize(maxFileSizeBytes)}.`);
          continue;
        }
        if (files.some((file) => file.name === candidate.name && file.size === candidate.size && file.lastModified === candidate.lastModified)) {
          continue;
        }

        try {
          const file = compressImages && candidate.type.startsWith('image/')
            ? await compressImage(candidate, maxImageDimension, imageQuality)
            : candidate;
          additions.push(file);
        } catch (error: unknown) {
          nextErrors.push(error instanceof Error ? `${candidate.name}: ${error.message}` : `${candidate.name}: gagal diproses.`);
        }
      }

      if (additions.length > 0) onFilesChange([...files, ...additions]);
      setErrors(nextErrors);
      if (inputRef.current) inputRef.current.value = '';
    } finally {
      setIsProcessing(false);
    }
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.currentTarget.files) void addFiles(event.currentTarget.files);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (!disabled && !isProcessing) void addFiles(event.dataTransfer.files);
  };

  const removeFile = (fileToRemove: File) => {
    onFilesChange(files.filter((file) => file !== fileToRemove));
  };

  const statusLabel: Record<FileUploadStatus, string> = {
    idle: 'Menunggu unggahan',
    uploading: 'Mengunggah',
    queued: 'Tersimpan di antrean offline',
    error: 'Gagal diunggah',
  };

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-sm font-medium text-text">{label}</p>
      <div
        role="button"
        tabIndex={disabled || isProcessing ? -1 : 0}
        aria-disabled={disabled || isProcessing}
        onClick={() => !disabled && !isProcessing && inputRef.current?.click()}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ' ') && !disabled && !isProcessing) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
        }}
        onDrop={onDrop}
        className={cn(
          'flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center outline-none transition focus-visible:ring-2 focus-visible:ring-primary-500',
          isDragging ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10' : 'border-border-strong bg-surface hover:bg-surface-2',
          (disabled || isProcessing) && 'cursor-not-allowed opacity-60',
        )}
      >
        <input ref={inputRef} type="file" accept={accept} multiple={multiple} disabled={disabled || isProcessing} className="sr-only" onChange={onInputChange} />
        {isProcessing ? <LoaderCircle className="h-6 w-6 animate-spin text-primary-500" aria-hidden="true" /> : <UploadCloud className="h-6 w-6 text-primary-500" aria-hidden="true" />}
        <span className="text-sm font-semibold text-text">
          {isProcessing ? 'Memproses berkas...' : 'Pilih berkas atau seret ke sini'}
        </span>
        <span className="text-xs text-muted-foreground">
          Maks. {maxFiles} berkas · {formatFileSize(maxFileSizeBytes)} per berkas
        </span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>

      {errors.length > 0 && (
        <ul className="space-y-1 text-sm text-danger" role="alert">
          {errors.map((error, index) => <li key={`${index}-${error}`}>{error}</li>)}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="space-y-2" aria-label="Berkas terpilih">
          {files.map((file, index) => {
            const preview = previews.get(file);
            return (
              <li key={`${file.name}-${file.lastModified}-${index}`} className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-surface p-3">
                {preview ? (
                  <img src={preview} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />
                ) : (
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-surface-2 text-muted-foreground">
                    {file.type.startsWith('image/') ? <FileImage className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)} · {statusLabel[uploadStatus]}</p>
                  {uploadStatus === 'uploading' && uploadProgress !== undefined && (
                    <progress className="mt-1 h-1.5 w-full accent-primary-500" max={100} value={Math.max(0, Math.min(100, uploadProgress))} aria-label={`Progres unggah ${file.name}`} />
                  )}
                </div>
                {!disabled && uploadStatus !== 'uploading' && (
                  <button type="button" onClick={() => removeFile(file)} className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-danger-bg hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500" aria-label={`Hapus ${file.name}`}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {isProcessing && <p className="sr-only" role="status">Berkas sedang divalidasi dan gambar dikompres.</p>}
    </div>
  );
}
