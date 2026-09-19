import { Link } from 'react-router-dom';
import { Panel, SegmentReadout, buttonClassName } from './ui';

/*
 * 404, as an unlit panel.
 *
 * The world's rule is that an unlit key is drawn as deliberately as a lit one,
 * and this page is that rule at full scale: the machine is on, the panel is
 * there, and the address is simply not wired to anything. The number is set on
 * the seven-segment readout — the one place a display says what it is reading —
 * so the page reads as an instrument reporting nothing rather than as an error
 * card apologising.
 */

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4">
      <Panel title="No signal" className="w-full">
        <div className="flex flex-col items-center gap-6 py-6 text-center">
          {/* Ink, not signal: red in this world means a thing is running now, and
              nothing here is. */}
          <SegmentReadout value="404" size="xl" tone="ink" label="Status" />

          <div className="flex flex-col gap-2">
            <h1 className="font-faceplate text-2xl text-ink">Nothing at this address</h1>
            <p className="mx-auto max-w-prose text-ink-muted">
              The page or recipe you asked for is not here. It may have been deleted, or the link
              may have been mistyped.
            </p>
          </div>

          <Link to="/" className={buttonClassName({ size: 'lg' })}>
            Back to the cookbook
          </Link>
        </div>
      </Panel>
    </div>
  );
}
