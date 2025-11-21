export type DocumentMethod = 'Inline Bytes' | 'Batch GCS' | 'Inline Image';

export interface DocumentResult {
  id: string;
  filename: string;
  moduleId?: string | null;
  method: DocumentMethod;
  elapsedMs: number;
  text: string;
  uploadedBy?: string | null;
  title?: string | null;
  createdAt: Date;
}
