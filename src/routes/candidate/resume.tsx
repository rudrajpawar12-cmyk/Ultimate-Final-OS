import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Eye, FileText, Trash2, Upload } from "lucide-react";
import { useState } from "react";

import { AsyncSection, ListSkeleton } from "@/components/candidate/async-section";
import { CandidatePage } from "@/components/candidate/candidate-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/states";
import {
  useCreateResume,
  useDeleteResumeMetadata,
  useResumesList,
  useSetActiveResumeMetadata,
} from "@/hooks/use-resumes";
import {
  useDeleteResumeFile,
  useSignedDownloadUrl,
  useSignedPreviewUrl,
  useUploadResume,
} from "@/hooks/use-resume-storage";
import { candidateService } from "@/services/candidate.service";
import type { ResumeDTO } from "@/repositories/supabase-resumes.repository";

export const Route = createFileRoute("/candidate/resume")({
  head: () => ({
    meta: [
      { title: "Resume manager — CareerOS" },
      { name: "description", content: "Upload, replace and version your resume inside CareerOS." },
      { property: "og:title", content: "Resume manager — CareerOS" },
      { property: "og:description", content: "Upload, replace, preview and version your resume." },
    ],
  }),
  component: ResumePage,
});

function getMimeType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".docx"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "application/octet-stream";
}

function ResumePage() {
  const query = useResumesList();
  const createMetadata = useCreateResume();
  const uploadFile = useUploadResume();
  const deleteFile = useDeleteResumeFile();
  const remove = useDeleteResumeMetadata();
  const setActive = useSetActiveResumeMetadata();
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFile(file: File) {
    const message = candidateService.validateResumeFile({ name: file.name, sizeBytes: file.size });
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setIsUploading(true);
    setProgress(15);
    const timer = setInterval(() => setProgress((current) => Math.min(current + 20, 90)), 180);

    try {
      // Step 1: Upload file to storage
      const uploadResult = await uploadFile.mutateAsync({
        fileName: file.name,
        file,
        contentType: getMimeType(file.name),
        upsert: true,
      });

      setProgress(70);

      // Step 2: Create metadata record with storage path
      await createMetadata.mutateAsync({
        fileName: file.name,
        originalFileName: file.name,
        fileSize: file.size,
        mimeType: getMimeType(file.name),
        storagePath: uploadResult.storagePath,
      });

      setProgress(100);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      clearInterval(timer);
      setTimeout(() => setProgress(0), 300);
      setIsUploading(false);
    }
  }

  async function handleDelete(resume: ResumeDTO) {
    try {
      // Delete the file from storage if a storage path exists
      if (resume.storagePath) {
        await deleteFile.mutateAsync(resume.storagePath);
      }
      // Delete the metadata record
      remove.mutate(resume.id);
    } catch {
      // Metadata deletion will still proceed via the mutation
    }
  }

  return (
    <CandidatePage
      title="Resume"
      description="Your active resume powers matching, scoring and AI analysis."
      actions={
        <Button asChild variant="outline">
          <Link to="/candidate/resume-analyzer">Analyze resume</Link>
        </Button>
      }
    >
      <Card className="shadow-elevated border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Upload or replace</CardTitle>
          <CardDescription>PDF, DOC or DOCX up to 5 MB.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-10 text-center transition-colors hover:bg-muted">
            <Upload className="size-6 text-primary" />
            <span className="text-sm font-medium">Choose a file</span>
            <span className="text-xs text-muted-foreground">Replaces your active resume</span>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              className="sr-only"
              disabled={isUploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
          </label>
          {isUploading && <Progress value={progress} />}
          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      <AsyncSection
        isLoading={query.isLoading}
        isError={query.isError}
        data={query.data}
        onRetry={() => void query.refetch()}
        skeleton={<ListSkeleton count={3} />}
        isEmpty={(resumes) => resumes.length === 0}
        emptyTitle="No resume uploaded"
        emptyDescription="Upload your resume to unlock scoring and matching."
      >
        {(resumes) => {
          const active = resumes.find((resume) => resume.isActive);
          return (
            <div className="grid gap-4 lg:grid-cols-2">
              <ResumePreviewCard resume={active ?? null} />

              <Card className="shadow-elevated border-border/70">
                <CardHeader>
                  <CardTitle className="text-base">Resume history</CardTitle>
                  <CardDescription>{resumes.length} versions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {resumes.length ? (
                    resumes.map((resume, index) => (
                      <div
                        key={resume.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{resume.originalFileName}</p>
                          <p className="text-xs text-muted-foreground">
                            v{resumes.length - index} · {Math.round(resume.fileSize / 1024)} KB ·{" "}
                            {new Date(resume.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {resume.storagePath && <ResumeDownloadButton storagePath={resume.storagePath} />}
                          {resume.isActive ? (
                            <Badge variant="secondary">Active</Badge>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={setActive.isPending}
                              onClick={() => setActive.mutate(resume.id)}
                            >
                              Make active
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${resume.originalFileName}`}
                            disabled={remove.isPending || deleteFile.isPending}
                            onClick={() => void handleDelete(resume)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState title="No versions yet" />
                  )}
                </CardContent>
              </Card>
            </div>
          );
        }}
      </AsyncSection>
    </CandidatePage>
  );
}

/**
 * Preview card that shows an inline PDF preview using a signed URL
 * when the active resume has a storage path and is a PDF.
 */
function ResumePreviewCard({ resume }: { resume: ResumeDTO | null }) {
  const storagePath = resume?.storagePath ?? "";
  const isPdf = resume?.mimeType === "application/pdf";
  const canPreview = Boolean(storagePath) && isPdf;

  const { data: previewData, isLoading } = useSignedPreviewUrl(storagePath, {
    enabled: canPreview,
  });

  return (
    <Card className="shadow-elevated border-border/70">
      <CardHeader>
        <CardTitle className="text-base">Preview</CardTitle>
        <CardDescription>{resume?.originalFileName ?? "No active resume"}</CardDescription>
      </CardHeader>
      <CardContent>
        {canPreview && previewData?.signedUrl ? (
          <iframe
            src={previewData.signedUrl}
            title="Resume preview"
            className="h-64 w-full rounded-xl border border-border"
          />
        ) : (
          <div className="grid h-64 place-items-center rounded-xl border border-dashed border-border bg-muted/40 text-center">
            <div className="space-y-2 px-6">
              <FileText className="mx-auto size-8 text-primary" />
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? "Loading preview…"
                  : !resume
                    ? "Upload a resume to see a preview."
                    : !storagePath
                      ? "No file stored. Re-upload to enable preview."
                      : !isPdf
                        ? "Preview is available for PDF files only. Download to review."
                        : "Preview unavailable."}
              </p>
              {resume?.storagePath && (
                <ResumePreviewButton storagePath={resume.storagePath} />
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Button that opens the resume in a new tab using a signed preview URL.
 */
function ResumePreviewButton({ storagePath }: { storagePath: string }) {
  const { data } = useSignedPreviewUrl(storagePath, { enabled: true });

  if (!data?.signedUrl) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className="mt-2"
      onClick={() => window.open(data.signedUrl, "_blank")}
    >
      <Eye className="mr-1.5 size-3.5" />
      Open in new tab
    </Button>
  );
}

/**
 * Button that triggers a download using a signed download URL.
 */
function ResumeDownloadButton({ storagePath }: { storagePath: string }) {
  const { data } = useSignedDownloadUrl(storagePath, { enabled: true });

  if (!data?.signedUrl) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Download resume"
      asChild
    >
      <a href={data.signedUrl} download>
        <Download className="size-4" />
      </a>
    </Button>
  );
}