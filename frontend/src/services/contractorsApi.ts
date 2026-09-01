import { api } from "./api";

export const contractorsApi = {
  async dashboard(): Promise<any> {
    return api.get<any>("/contractors/dashboard");
  },
  async profile(): Promise<any> {
    return api.get<any>("/contractors/profile");
  },
  async updateProfile(data: Record<string, unknown>): Promise<any> {
    return api.put<any>("/contractors/profile", data);
  },
  async createMilestone(data: Record<string, unknown>): Promise<any> {
    return api.post<any>("/contractors/milestones", data);
  },
  async completeMilestone(id: string): Promise<any> {
    return api.post<any>(`/contractors/milestones/${id}/complete`, {});
  },
  async getMilestone(id: string): Promise<any> {
    return api.get<any>(`/contractors/milestones/${id}`);
  },
  async createWorkDiary(data: Record<string, unknown>): Promise<any> {
    return api.post<any>("/contractors/work-diary", data);
  },
  async getWorkDiaries(contractorProjectId: string): Promise<any> {
    return api.get<any>(`/contractors/work-diary/${contractorProjectId}`);
  },
  async createDefect(data: Record<string, unknown>): Promise<any> {
    return api.post<any>("/contractors/defects", data);
  },
  async respondDefect(id: string, response: string): Promise<any> {
    return api.post<any>(`/contractors/defects/${id}/respond`, { response });
  },
  async closeDefect(id: string): Promise<any> {
    return api.post<any>(`/contractors/defects/${id}/close`, {});
  },
  async submitPayment(data: Record<string, unknown>): Promise<any> {
    return api.post<any>("/contractors/payments", data);
  },
  async getPayment(id: string): Promise<any> {
    return api.get<any>(`/contractors/payments/${id}`);
  },
  async submitResponse(data: Record<string, unknown>): Promise<any> {
    return api.post<any>("/contractors/responses", data);
  },
  async uploadDocument(data: Record<string, unknown>): Promise<any> {
    return api.post<any>("/contractors/documents", data);
  },
  async getMyDocuments(): Promise<any> {
    return api.get<any>("/contractors/documents");
  },
};
