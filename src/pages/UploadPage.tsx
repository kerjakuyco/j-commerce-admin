import { useMutation } from '@tanstack/react-query'
import { Copy, UploadCloud } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Panel } from '../components/Panel'
import { useToken } from '../context/AuthContext'
import { request } from '../lib/api'
import { readError } from '../lib/format'
import type { UploadedFile } from '../types'

export function UploadPage() {
  const token = useToken()
  const [files, setFiles] = useState<FileList | null>(null)
  const [uploaded, setUploaded] = useState<UploadedFile[]>([])
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!files?.length) throw new Error('Choose image files first')
      const body = new FormData()
      if (files.length === 1) {
        body.append('file', files[0])
        const result = await request<UploadedFile>('/upload/image', { token, method: 'POST', body })
        return [result]
      }
      Array.from(files).forEach((file) => body.append('files', file))
      return request<UploadedFile[]>('/upload/images', { token, method: 'POST', body })
    },
    onSuccess: (result) => {
      setUploaded(result)
      toast.success(`${result.length} file(s) uploaded`)
    },
    onError: (error) => toast.error(readError(error)),
  })

  async function copy(value: string) {
    await navigator.clipboard.writeText(value)
    toast.success('URL copied')
  }

  return (
    <div className="upload-layout">
      <Panel title="Asset intake dock" eyebrow="jpg png webp">
        <div className="dropzone">
          <UploadCloud size={42} />
          <strong>Drop-ready local upload</strong>
          <span>Max 5 files, 5 MB each. Assets are served from the API `/uploads/*` path.</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setFiles(event.target.files)} />
          <button className="primary-button" type="button" disabled={uploadMutation.isPending} onClick={() => uploadMutation.mutate()}>
            {uploadMutation.isPending ? 'Uploading...' : 'Upload selected files'}
          </button>
        </div>
      </Panel>
      <Panel title="Uploaded URLs" eyebrow={`${uploaded.length} assets`}>
        <div className="asset-list">
          {uploaded.map((file) => (
            <article key={file.filename}>
              <div>
                <strong>{file.filename}</strong>
                <span>{file.mimetype} · {Math.round(file.size / 1024)} KB</span>
                <code>{file.url}</code>
              </div>
              <button className="ghost-button" type="button" onClick={() => void copy(file.url)}><Copy size={16} /> Copy</button>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  )
}
