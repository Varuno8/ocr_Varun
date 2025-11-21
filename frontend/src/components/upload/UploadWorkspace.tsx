import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CloudUpload, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select } from '../ui/select';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useUpload } from '../../features/ocr/useUpload';
import { toast } from 'sonner';

const formSchema = z.object({
  moduleId: z.string().optional(),
  title: z.string().optional(),
  uploadedBy: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function UploadWorkspace({ onResult }: { onResult: (data: any) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  const upload = useUpload((data) => {
    onResult(data);
    toast.success('OCR completed');
  });

  const onSubmit = (values: FormValues) => {
    if (!file) {
      toast.error('Please add a file to process');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(values).forEach(([key, val]) => {
      if (val) formData.append(key, val);
    });
    upload.mutate(formData);
  };

  return (
    <Card className="hover-lift">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <CloudUpload className="h-5 w-5 text-primary" /> Upload Workspace
        </CardTitle>
        <p className="text-sm text-muted">Drag & drop documents or browse files. Supported: PDF, JPEG, PNG.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-white px-6 py-8 text-center hover:border-primary"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) setFile(dropped);
          }}
        >
          <CloudUpload className="h-10 w-10 text-primary" />
          <div className="text-lg font-semibold text-text">Drop files here or browse</div>
          <p className="text-sm text-muted">HIPAA-ready secure upload · Max 25MB · PDF/JPEG/PNG</p>
          <label className="mt-2 cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-white shadow">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            Choose file
          </label>
          {file && <div className="text-sm text-text">Selected: {file.name}</div>}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text">Module</label>
            <Select {...register('moduleId')} defaultValue="">
              <option value="">Select module</option>
              <option value="">Document Scanner</option>
              <option value="">Medicine Stock Parser</option>
              <option value="">OPD/IPD Forms</option>
              <option value="">Lab Reports</option>
              <option value="">General Upload</option>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-text">Title</label>
            <Input placeholder="e.g., OPD intake - 12 Sep" {...register('title')} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-text">Uploaded by</label>
            <Input placeholder="Dr. A.K. Sharma" {...register('uploadedBy')} />
            {errors.uploadedBy && <p className="text-xs text-error">{errors.uploadedBy.message}</p>}
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-text">Operator notes</label>
            <Textarea rows={3} placeholder="Any specifics for this run" {...register('notes')} />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={upload.isPending} className="flex items-center gap-2 px-6">
              {upload.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Run OCR
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
