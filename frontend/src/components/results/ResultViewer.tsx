import { Download, Timer } from 'lucide-react';
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
}

export function ResultViewer({ result }: ResultViewerProps) {
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
            <div className="rounded-lg border border-border bg-white p-3 font-mono text-sm leading-relaxed max-h-72 overflow-y-auto">
              {result.text || 'No text extracted.'}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => download('txt')} className="gap-2">
                <Download className="h-4 w-4" /> Download .txt
              </Button>
              <Button variant="outline" onClick={() => download('md')} className="gap-2">
                <Download className="h-4 w-4" /> Download .md
              </Button>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-white p-6 text-center text-muted">
            No OCR runs yet. Upload a document to see live results here.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
