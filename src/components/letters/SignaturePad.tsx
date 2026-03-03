import { useRef, useEffect, useState } from "react";
import SignaturePadLib from "signature_pad";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

interface SignaturePadProps {
  onSignatureChange: (dataUrl: string | null) => void;
}

export function SignaturePad({ onSignatureChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(ratio, ratio);
      // Restore after resize if pad exists
      if (padRef.current && !padRef.current.isEmpty()) {
        const data = padRef.current.toData();
        padRef.current.clear();
        padRef.current.fromData(data);
      }
    };

    const pad = new SignaturePadLib(canvas, {
      backgroundColor: "rgba(255, 255, 255, 0)",
      penColor: "#1a1a2e",
      minWidth: 1.5,
      maxWidth: 3,
    });

    pad.addEventListener("endStroke", () => {
      setIsEmpty(pad.isEmpty());
      onSignatureChange(pad.isEmpty() ? null : pad.toDataURL("image/png"));
    });

    padRef.current = pad;
    resizeCanvas();

    window.addEventListener("resize", resizeCanvas);
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      pad.off();
    };
  }, [onSignatureChange]);

  const handleClear = () => {
    padRef.current?.clear();
    setIsEmpty(true);
    onSignatureChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="relative rounded-lg border-2 border-dashed border-border bg-muted/20">
        <canvas
          ref={canvasRef}
          className="w-full touch-none cursor-crosshair"
          style={{ height: 120 }}
        />
        {isEmpty && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Sign here with your finger or mouse
          </p>
        )}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Draw your signature above
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={handleClear}
          disabled={isEmpty}
        >
          <Eraser className="h-3.5 w-3.5" />
          Clear
        </Button>
      </div>
    </div>
  );
}
