import { api } from "./api";
import type {
  DocumentListResult,
  DocumentStats,
  ProjectDocument,
  DocumentFilters,
} from "@/types/document-types";

// Re-export common types and constants for convenience so callers can
// `import { type ProjectDocument, DOCUMENT_TYPE_LABELS } from "@/services/document-api"`.
export type {
  ProjectDocument,
  DocumentType,
  VerificationStatus,
  DocumentListResult,
  DocumentStats,
  DocumentFilters,
  DocumentUser,
} from "@/types/document-types";

export {
  DOCUMENT_TYPE_LABELS,
  VERIFICATION_STATUS_LABELS,
  VERIFICATION_STATUS_COLORS,
} from "@/types/document-types";

export interface UploadDocumentPayload {
  projectId: string;
  type: string;
  title: string;
  description?: string;
  file: File;
}

export const documentApi = {
  /**
   * List documents for a project.
   */
  async getProjectDocuments(
    projectId: string,
    filters?: Partial<DocumentFilters>
  ): Promise<DocumentListResult> {
    const params = new URLSearchParams();
    params.set("projectId", projectId);
    if (filters?.type) params.set("type", filters.type);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.search) params.set("search", filters.search);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.limit) params.set("limit", String(filters.limit));
    return api.get<DocumentListResult>(`/documents?${params.toString()}`);
  },

  /**
   * Convenience alias used by the DocumentsTab UI: same as getProjectDocuments.
   */
  list(filters: { projectId?: string; type?: string; status?: string; search?: string; page?: number; limit?: number } = {}) {
    if (!filters.projectId) {
      throw new Error("documentApi.list requires a projectId");
    }
    return this.getProjectDocuments(filters.projectId, filters as DocumentFilters);
  },

  /**
   * Get document stats for a project.
   */
  async getStats(projectId: string): Promise<{ stats: DocumentStats }> {
    return api.get<{ stats: DocumentStats }>(`/documents/stats?projectId=${projectId}`);
  },

  /**
   * Convenience alias for getStats that returns just the stats blob.
   */
  async stats(projectId: string): Promise<DocumentStats> {
    const { stats } = await this.getStats(projectId);
    return stats;
  },

  /**
   * Upload a document to a project. Accepts either a FormData (with the
   * projectId already appended) or a typed payload.
   */
  async upload(
    projectIdOrPayload: string | UploadDocumentPayload,
    formDataOrUndefined?: FormData
  ): Promise<{ document: ProjectDocument }> {
    let formData: FormData;
    if (typeof projectIdOrPayload === "string" && formDataOrUndefined instanceof FormData) {
      formData = formDataOrUndefined;
    } else {
      const payload = projectIdOrPayload as UploadDocumentPayload;
      formData = new FormData();
      formData.set("type", payload.type);
      formData.set("title", payload.title);
      if (payload.description) formData.set("description", payload.description);
      formData.append("file", payload.file);
    }
    return api.postForm<{ document: ProjectDocument }>(
      `/projects/${formData.get("projectId") ?? projectIdOrPayload}/documents`,
      formData
    );
  },

  /**
   * Verify or reject a document.
   */
  async verify(
    id: string,
    status: string,
    note?: string
  ): Promise<{ document: ProjectDocument }> {
    return api.patch<{ document: ProjectDocument }>(
      `/documents/${id}/verify`,
      { status, note }
    );
  },

  /**
   * Delete a document.
   */
  async remove(id: string): Promise<void> {
    return api.delete(`/documents/${id}`);
  },

  /**
   * Delete a document (alias for `remove`).
   */
  async delete(id: string): Promise<void> {
    return this.remove(id);
  },

  /**
   * Run AI analysis on a document.
   */
  async analyze(id: string): Promise<void> {
    return api.post(`/documents/${id}/analyze`, {});
  },
};
