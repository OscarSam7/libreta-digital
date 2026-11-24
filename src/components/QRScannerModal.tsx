'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import jsQR from 'jsqr';
import {
  Camera,
  Flashlight,
  FlashlightOff,
  ImagePlus,
  Loader2,
  RotateCcw,
  ScanLine,
  ShieldAlert,
  X,
  KeyRound,
} from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => Promise<{ success: boolean; message?: string }>;
  title?: string;
  subtitle?: string;
}

/**
 * Visor de cámara móvil en Portal React para escanear códigos QR de compras fiadas
 * y certificar al instante (usa BarcodeDetector nativo cuando existe y jsQR como respaldo universal).
 */
export function QRScannerModal({
  isOpen,
  onClose,
  onScan,
  title = 'Escanear QR del Comercio',
  subtitle = 'Apuntá la cámara al código QR en caja para certificar tu compra al instante.',
}: QRScannerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [cameraState, setCameraState] = useState<'STARTING' | 'SCANNING' | 'PROCESSING' | 'ERROR'>('STARTING');
  const [errorMsg, setErrorMsg] = useState('');
  const [scanFeedbackError, setScanFeedbackError] = useState('');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const processingRef = useRef(false);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    setMounted(true);
  }, []);

  const stopCamera = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch {}
    }
    setTorchOn(false);
    setTorchSupported(false);
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    processingRef.current = false;
    onCloseRef.current();
  }, [stopCamera]);

  const handleDetectedCode = useCallback(
    async (decodedText: string) => {
      if (processingRef.current || !decodedText) return;
      processingRef.current = true;
      setScanFeedbackError('');
      setCameraState('PROCESSING');

      try {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          navigator.vibrate(80);
        }
      } catch {}

      try {
        const res = await onScanRef.current(decodedText);
        if (res.success) {
          stopCamera();
          processingRef.current = false;
          onCloseRef.current();
        } else {
          setScanFeedbackError(res.message || 'El código QR escaneado no es válido.');
          setCameraState(streamRef.current ? 'SCANNING' : 'ERROR');
          processingRef.current = false;
        }
      } catch (err: any) {
        setScanFeedbackError(err?.message || 'No se pudo procesar el código QR.');
        setCameraState(streamRef.current ? 'SCANNING' : 'ERROR');
        processingRef.current = false;
      }
    },
    [stopCamera]
  );

  useEffect(() => {
    if (!isOpen || !mounted) return;

    let cancelled = false;
    let loadedMetadataCleanup: (() => void) | null = null;
    processingRef.current = false;
    setErrorMsg('');
    setScanFeedbackError('');
    setCameraState('STARTING');

    async function openCameraWithFallback(): Promise<MediaStream> {
      const constraintAttempts: MediaStreamConstraints[] = [
        {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        },
        {
          video: {
            facingMode: { ideal: 'environment' },
          },
          audio: false,
        },
        {
          video: true,
          audio: false,
        },
      ];

      let lastError: unknown;
      for (const constraints of constraintAttempts) {
        try {
          return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err: any) {
          lastError = err;
          const name = err?.name || '';
          if (
            name === 'NotAllowedError' ||
            name === 'PermissionDeniedError' ||
            name === 'NotFoundError' ||
            name === 'DevicesNotFoundError'
          ) {
            throw err;
          }
        }
      }
      throw lastError;
    }

    async function initCamera() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) {
          setErrorMsg(
            'Tu navegador no permite abrir la cámara en vivo (por ejemplo dentro de WhatsApp o sin HTTPS). Podés sacar una foto del QR o usar tu PIN de 4 dígitos.'
          );
          setCameraState('ERROR');
        }
        return;
      }

      try {
        const stream = await openCameraWithFallback();

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        let videoEl = videoRef.current;
        if (!videoEl) {
          await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
          videoEl = videoRef.current;
        }

        if (cancelled || !videoEl) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        videoEl.setAttribute('playsinline', 'true');
        videoEl.muted = true;
        videoEl.srcObject = stream;

        const onLoadedMetadata = () => {
          if (!cancelled && videoEl && videoEl.paused) {
            videoEl.play().catch(() => {});
          }
        };
        videoEl.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
        loadedMetadataCleanup = () => {
          videoEl?.removeEventListener('loadedmetadata', onLoadedMetadata);
        };

        await videoEl.play().catch(() => {});

        if (cancelled) {
          stopCamera();
          return;
        }

        // Detectar soporte de linterna (torch)
        try {
          const track = stream.getVideoTracks()[0];
          const caps = track?.getCapabilities?.() as any;
          if (caps && caps.torch) {
            setTorchSupported(true);
          }
        } catch {}

        setCameraState('SCANNING');

        // Preparar BarcodeDetector nativo si está disponible en Chrome/Android
        let barcodeDetector: any = null;
        try {
          const BD = (window as any).BarcodeDetector;
          if (typeof BD === 'function') {
            barcodeDetector = new BD({ formats: ['qr_code'] });
          }
        } catch {}

        intervalRef.current = window.setInterval(async () => {
          if (cancelled || processingRef.current) return;
          const v = videoRef.current;
          if (!v || v.readyState < 2 || v.videoWidth === 0 || v.videoHeight === 0) return;

          if (barcodeDetector) {
            try {
              const detected = await barcodeDetector.detect(v);
              if (Array.isArray(detected) && detected.length > 0 && detected[0]?.rawValue) {
                await handleDetectedCode(String(detected[0].rawValue));
                return;
              }
            } catch {}
          }

          const canvas = canvasRef.current;
          if (!canvas) return;
          const targetWidth = Math.min(512, v.videoWidth);
          const scale = targetWidth / v.videoWidth;
          const targetHeight = Math.round(v.videoHeight * scale);
          if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
          }

          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return;
          ctx.drawImage(v, 0, 0, targetWidth, targetHeight);
          const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
          const code = jsQR(imageData.data, targetWidth, targetHeight, {
            inversionAttempts: 'attemptBoth',
          });
          if (code && code.data) {
            await handleDetectedCode(code.data);
          }
        }, 150);
      } catch (err: any) {
        if (cancelled) return;
        const name = err?.name || '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setErrorMsg(
            'Permiso de cámara denegado. Habilitá la cámara en tu navegador, sacá una foto del QR o usá tu PIN de 4 dígitos.'
          );
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setErrorMsg(
            'No detectamos cámara disponible en este dispositivo. Podés subir una foto del QR o usar tu PIN de 4 dígitos.'
          );
        } else {
          setErrorMsg(
            'No se pudo iniciar la cámara en vivo. Podés sacar una foto del QR o confirmar con tu PIN de 4 dígitos.'
          );
        }
        setCameraState('ERROR');
      }
    }

    initCamera();

    return () => {
      cancelled = true;
      loadedMetadataCleanup?.();
      stopCamera();
    };
  }, [isOpen, mounted, retryTick, stopCamera, handleDetectedCode]);

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || processingRef.current) return;

    setScanFeedbackError('');
    setCameraState('PROCESSING');

    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(file);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('No se pudo leer la foto seleccionada.'));
        image.src = objectUrl;
      });

      const naturalWidth = img.naturalWidth || img.width;
      const naturalHeight = img.naturalHeight || img.height;
      if (!naturalWidth || !naturalHeight) {
        throw new Error('La imagen seleccionada no es válida.');
      }

      const maxSide = 1200;
      const scale = Math.min(1, maxSide / Math.max(naturalWidth, naturalHeight));
      const targetWidth = Math.max(1, Math.round(naturalWidth * scale));
      const targetHeight = Math.max(1, Math.round(naturalHeight * scale));

      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = targetWidth;
      offscreenCanvas.height = targetHeight;
      const ctx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        throw new Error('No se pudo procesar la foto en este dispositivo.');
      }

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      let decodedText = '';
      try {
        const BD = (window as any).BarcodeDetector;
        if (typeof BD === 'function') {
          const detector = new BD({ formats: ['qr_code'] });
          const detected = await detector.detect(offscreenCanvas);
          if (Array.isArray(detected) && detected.length > 0 && detected[0]?.rawValue) {
            decodedText = String(detected[0].rawValue);
          }
        }
      } catch {}

      if (!decodedText) {
        const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        const code = jsQR(imageData.data, targetWidth, targetHeight, {
          inversionAttempts: 'attemptBoth',
        });
        if (code && code.data) {
          decodedText = code.data;
        }
      }

      if (decodedText) {
        await handleDetectedCode(decodedText);
      } else {
        setScanFeedbackError(
          'No se encontró un código QR legible en la foto. Intentá acercarte un poco más o usá tu PIN de 4 dígitos.'
        );
        setCameraState(streamRef.current ? 'SCANNING' : 'ERROR');
      }
    } catch (err: any) {
      setScanFeedbackError(
        err?.message || 'No se encontró un código QR legible en la foto. Intentá acercarte un poco más o usá tu PIN de 4 dígitos.'
      );
      setCameraState(streamRef.current ? 'SCANNING' : 'ERROR');
    } finally {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    }
  };

  const toggleTorch = async () => {
    const stream = streamRef.current;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    const nextState = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: nextState } as any],
      });
      setTorchOn(nextState);
    } catch {}
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-md flex flex-col justify-between p-4 text-white font-sans animate-in fade-in duration-150">
      <style>{`
        @keyframes qr-scan-line {
          0% {
            top: 10%;
          }
          50% {
            top: 86%;
          }
          100% {
            top: 10%;
          }
        }
        .qr-scan-beam {
          animation: qr-scan-line 2.1s ease-in-out infinite;
        }
      `}</style>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoFileChange}
      />

      {/* Cabecera */}
      <div className="flex items-start justify-between gap-3 max-w-md w-full mx-auto pt-1">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center shrink-0">
            <ScanLine className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-black text-white leading-tight truncate">{title}</h3>
            <p className="text-[11px] text-slate-300 leading-snug mt-0.5">{subtitle}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer shrink-0"
          aria-label="Cerrar lector QR"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Área de Cámara */}
      <div className="flex-1 flex flex-col items-center justify-center my-4 max-w-md w-full mx-auto">
        {cameraState === 'ERROR' ? (
          <div className="w-full bg-slate-900 border border-slate-700 rounded-3xl p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-sm font-black text-white">Cámara no disponible</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{errorMsg}</p>
            </div>
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <ImagePlus className="w-4 h-4" />
                <span>Tomar foto del QR</span>
              </button>
              <button
                type="button"
                onClick={() => setRetryTick((t) => t + 1)}
                className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reintentar cámara</span>
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg"
              >
                <KeyRound className="w-4 h-4" />
                <span>Usar PIN de 4 dígitos (2ª opción)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="relative w-full aspect-square max-w-[340px] rounded-3xl overflow-hidden bg-black border-2 border-white/15 shadow-2xl">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Marco visor QR */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-56 h-56 relative">
                <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
                {cameraState === 'SCANNING' && (
                  <div className="qr-scan-beam absolute left-2 right-2 h-0.5 bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.95)]" />
                )}
              </div>
            </div>

            {cameraState === 'STARTING' && (
              <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-2 text-xs font-bold text-slate-300">
                <Camera className="w-8 h-8 text-emerald-400 animate-pulse" />
                <span>Iniciando cámara...</span>
              </div>
            )}

            {cameraState === 'PROCESSING' && (
              <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center gap-2.5 text-sm font-black text-emerald-300">
                <Loader2 className="w-9 h-9 animate-spin text-emerald-400" />
                <span>Procesando código QR...</span>
              </div>
            )}

            {torchSupported && cameraState === 'SCANNING' && (
              <button
                type="button"
                onClick={toggleTorch}
                className="absolute bottom-3 right-3 px-3 py-2 rounded-xl bg-slate-900/80 border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-md cursor-pointer hover:bg-slate-800 transition"
              >
                {torchOn ? <FlashlightOff className="w-4 h-4 text-amber-300" /> : <Flashlight className="w-4 h-4" />}
                <span>{torchOn ? 'Apagar luz' : 'Linterna'}</span>
              </button>
            )}
          </div>
        )}

        {scanFeedbackError && (
          <div className="mt-4 w-full max-w-[340px] bg-rose-950/90 border border-rose-500/60 text-rose-100 rounded-2xl p-3 text-xs space-y-2 text-center">
            <p className="font-semibold">{scanFeedbackError}</p>
            <button
              type="button"
              onClick={() => {
                setScanFeedbackError('');
                processingRef.current = false;
                if (streamRef.current) {
                  setCameraState('SCANNING');
                } else {
                  fileInputRef.current?.click();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white font-bold rounded-xl text-[11px] transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{streamRef.current ? 'Escanear otro QR' : 'Sacar otra foto'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Pie / Respaldo foto y 2da Opción PIN */}
      <div className="max-w-md w-full mx-auto pb-2 text-center space-y-2">
        {cameraState !== 'ERROR' && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2.5 px-4 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-emerald-200 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <ImagePlus className="w-4 h-4" />
            <span>¿Problemas con la cámara? Tomar foto del QR</span>
          </button>
        )}
        <button
          type="button"
          onClick={handleClose}
          className="w-full py-3 px-4 bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold rounded-2xl text-xs transition cursor-pointer"
        >
          Cerrar o usar PIN de 4 dígitos (2ª opción)
        </button>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
