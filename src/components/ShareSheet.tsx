import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, FileDown, Link2, Lock, Printer, QrCode } from 'lucide-react';
import { haptic } from '../lib/haptics';
import { Button, Sheet, useToast } from './ui';

/*
 * Proof's own share sheet, for where the system's is not available: most
 * desktop browsers, older Android WebViews.
 *
 * A recipe with an address offers it — copy it, or show it as a QR code to a
 * phone across the counter. One that lives only on this device has no address
 * anyone else can open, and says so in one line, rather than offering a link
 * that would lead nowhere. Either way it can go as text, a PDF or on paper.
 */
export interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** The public address, or null for a recipe only on this device. */
  url: string | null;
  /** The recipe as plain text. */
  text: string;
  onPdf: () => void;
  /** For a private recipe of the owner's: opens publishing. */
  onPublish?: () => void;
}

export default function ShareSheet({ open, onClose, title, url, text, onPdf, onPublish }: ShareSheetProps) {
  const toast = useToast();
  const [qr, setQr] = useState(false);

  const copy = async (value: string, done: string) => {
    try {
      await navigator.clipboard.writeText(value);
      haptic('light');
      toast.show({ message: done });
      onClose();
    } catch {
      toast.show({ message: "Couldn't reach the clipboard. Select the text and copy it instead.", tone: 'fault' });
    }
  };

  const row = 'w-full justify-start';
  return (
    <Sheet
      open={open}
      onClose={() => {
        setQr(false);
        onClose();
      }}
      title={`Share ${title}`}
      placement="bottom"
      size="md"
    >
      <div className="flex flex-col gap-2">
        {url ? (
          <>
            <Button size="lg" className={row} icon={<Link2 className="h-5 w-5" aria-hidden="true" />} onClick={() => copy(url, 'Link copied')}>
              Copy link
            </Button>
            <Button size="lg" className={row} engaged={qr} icon={<QrCode className="h-5 w-5" aria-hidden="true" />} onClick={() => setQr((v) => !v)}>
              QR code
            </Button>
            {qr ? (
              <div className="flex flex-col items-center gap-2 py-2">
                {/* The code keeps its white quiet zone in both themes: a scanner reads contrast, not taste. */}
                <div className="rounded-key bg-white p-4">
                  <QRCodeSVG value={url} size={184} level="M" />
                </div>
                <p className="text-sm text-ink-muted">Scan to open it on a phone.</p>
              </div>
            ) : null}
          </>
        ) : (
          <p className="flex items-start gap-2 pb-2 text-sm text-ink-2">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Private · only on this device, so it has no link.{' '}
              {onPublish ? (
                <button type="button" onClick={onPublish} className="pressable rounded-control font-semibold text-ink">
                  Publish it to get one.
                </button>
              ) : null}
            </span>
          </p>
        )}
        <Button size="lg" className={row} icon={<Copy className="h-5 w-5" aria-hidden="true" />} onClick={() => copy(text, 'Recipe copied as text')}>
          Copy as text
        </Button>
        <Button
          size="lg"
          className={row}
          icon={<FileDown className="h-5 w-5" aria-hidden="true" />}
          onClick={() => {
            onClose();
            onPdf();
          }}
        >
          Save as PDF
        </Button>
        <Button
          size="lg"
          className={row}
          icon={<Printer className="h-5 w-5" aria-hidden="true" />}
          onClick={() => {
            onClose();
            window.print();
          }}
        >
          Print
        </Button>
      </div>
    </Sheet>
  );
}
