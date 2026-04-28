import { apiClient } from "@/lib/apiClient";
import { Project } from "@/types/types";

export type SharedProjectComment = {
  id: number;
  author_name: string;
  body: string;
  isAdminReply: boolean;
  createdAt: string;
  replies: SharedProjectCommentReply[];
};

export type SharedProjectCommentReply = Omit<SharedProjectComment, "replies">;

export type SharedProjectCommentsResponse = {
  comments: SharedProjectComment[];
  canReplyAsAdmin: boolean;
};

export async function createShareToken(projectId: string) {
  const response = await apiClient.post<{ token: string }>(
    `/api/projects/${projectId}/share/`,
    {},
  );
  return response.data.token;
}

export async function getSharedProjectByToken(token: string): Promise<Project> {
  const response = await apiClient.get<Project>(`/api/projects/shared/${token}/`);
  return response.data;
}

export async function getSharedProjectComments(
  token: string,
): Promise<SharedProjectCommentsResponse> {
  const response = await apiClient.get<SharedProjectCommentsResponse>(
    `/api/projects/shared/${token}/comments/`,
  );
  return response.data;
}

export async function createSharedProjectComment(
  token: string,
  payload: { author_name: string; body: string },
) {
  const response = await apiClient.post<SharedProjectComment>(
    `/api/projects/shared/${token}/comments/`,
    payload,
  );
  return response.data;
}

export async function createSharedProjectReply(
  token: string,
  commentId: number,
  body: string,
) {
  const response = await apiClient.post<SharedProjectCommentReply>(
    `/api/projects/shared/${token}/comments/${commentId}/replies/`,
    { body },
  );
  return response.data;
}
