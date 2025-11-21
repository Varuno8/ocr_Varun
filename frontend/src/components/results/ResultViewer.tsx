import { AlertCircle, Download, ScanText, Timer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface ResultViewerProps {
  result?: {
    filename: string;
    method: string;
    elapsed: number;
    text: string;
  };
  onSampleExtract?: () => Promise<unknown> | void;
  isSampleLoading?: boolean;
  sampleError?: Error | null;
}

export function ResultViewer({ result, onSampleExtract, isSampleLoading, sampleError }: ResultViewerProps) {
  const download = (ext: 'txt' | 'md') => {
    if (!result) return;
    const blob = new Blob([result.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.filename}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formattedLines = result?.text
    ? result.text
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

  return (
    <Card className="hover-lift">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>OCR Results</CardTitle>
          <p className="text-sm text-muted">Preview the extracted text and export instantly.</p>
        </div>
        {result && <Badge variant="outline">{result.method}</Badge>}
      </CardHeader>
      <CardContent className="space-y-4">
        {result ? (
          <>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
              <span className="font-medium text-text">{result.filename}</span>
              <span className="flex items-center gap-1"><Timer className="h-4 w-4" /> {result.elapsed}ms</span>
            </div>
            <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-white via-blue-50/40 to-indigo-50 p-4 shadow-inner">
              {formattedLines.length > 0 ? (
                <div className="grid gap-3 max-h-72 overflow-y-auto pr-1">
                  {formattedLines.map((line, idx) => (
                    <div
                      key={`${idx}-${line.slice(0, 10)}`}
                      className="flex gap-3 rounded-xl bg-white/80 p-3 shadow-sm ring-1 ring-primary/5"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {idx + 1}
                      </span>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-text">{line}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-white/60 p-6 text-center text-sm text-muted">
                  No text extracted.
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => download('txt')} className="gap-2">
                <Download className="h-4 w-4" /> Download .txt
              </Button>
              <Button variant="outline" onClick={() => download('md')} className="gap-2">
                <Download className="h-4 w-4" /> Download .md
              </Button>
              {onSampleExtract && (
                <Button onClick={() => onSampleExtract()} className="gap-2">
                  {isSampleLoading ? <Timer className="h-4 w-4 animate-spin" /> : <ScanText className="h-4 w-4" />}
                  Extract sample text
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-dashed border-border bg-white p-6 text-center text-muted">
              No OCR runs yet. Upload a document or trigger a sample extraction to see live results here.
            </div>
            {onSampleExtract && (
              <div className="flex justify-center">
                <Button onClick={() => onSampleExtract()} disabled={isSampleLoading} className="gap-2">
                  {isSampleLoading ? <Timer className="h-4 w-4 animate-spin" /> : <ScanText className="h-4 w-4" />} Extract sample
                  text
                </Button>
              </div>
            )}
            {sampleError && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{sampleError.message}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
