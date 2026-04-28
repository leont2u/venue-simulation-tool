"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, MessageSquare, Send } from "lucide-react";
import {
  createSharedProjectComment,
  createSharedProjectReply,
  getSharedProjectComments,
  SharedProjectComment,
} from "@/lib/shareProject";

function formatCommentDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function CommentsPanel({ token }: { token: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const [comments, setComments] = useState<SharedProjectComment[]>([]);
  const [canReplyAsAdmin, setCanReplyAsAdmin] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [body, setBody] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadComments = useCallback(async () => {
    if (!token) return;

    try {
      const response = await getSharedProjectComments(token);
      setComments(response.comments);
      setCanReplyAsAdmin(response.canReplyAsAdmin);
      setError("");
    } catch {
      setError("Comments could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  const handleSubmitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authorName.trim() || !body.trim()) return;

    try {
      setSaving(true);
      const nextComment = await createSharedProjectComment(token, {
        author_name: authorName.trim(),
        body: body.trim(),
      });
      setComments((current) => [...current, nextComment]);
      setBody("");
      setError("");
    } catch {
      setError("Comment could not be posted.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitReply = async (commentId: number) => {
    const replyBody = replyDrafts[commentId]?.trim();
    if (!replyBody) return;

    try {
      const reply = await createSharedProjectReply(token, commentId, replyBody);
      setComments((current) =>
        current.map((comment) =>
          comment.id === commentId
            ? { ...comment, replies: [...comment.replies, reply] }
            : comment,
        ),
      );
      setReplyDrafts((current) => ({ ...current, [commentId]: "" }));
      setError("");
    } catch {
      setError("Admin reply could not be posted.");
    }
  };

  if (collapsed) {
    return (
      <aside className="flex h-full w-[52px] shrink-0 flex-col items-center border-l border-[var(--sf-border)] bg-white">
        <button
          onClick={() => setCollapsed(false)}
          title="Open comments"
          className="mt-3 flex h-10 w-10 items-center justify-center rounded-[6px] border border-[var(--sf-border-strong)] text-[var(--sf-text)] hover:bg-[var(--sf-surface-soft)]"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <MessageSquare className="mt-4 h-4 w-4 text-[var(--sf-text-muted)]" />
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-full max-w-[360px] shrink-0 flex-col border-l border-[var(--sf-border)] bg-white">
      <div className="flex h-[52px] items-center justify-between border-b border-[var(--sf-border)] px-4">
        <div className="flex items-center gap-2 text-[14px] font-semibold text-[var(--sf-text)]">
          <MessageSquare className="h-4 w-4 text-[#6f8f84]" />
          Comments
        </div>
        <button
          onClick={() => setCollapsed(true)}
          title="Collapse comments"
          className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[var(--sf-text-muted)] hover:bg-[var(--sf-surface-soft)]"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="text-[13px] text-[var(--sf-text-muted)]">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="rounded-[8px] border border-[var(--sf-border)] bg-[var(--sf-surface-soft)] p-4 text-[13px] leading-6 text-[var(--sf-text-muted)]">
            No comments yet.
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-[8px] border border-[var(--sf-border)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[13px] font-semibold text-[var(--sf-text)]">
                    {comment.author_name}
                  </div>
                  <div className="text-[11px] text-[var(--sf-text-muted)]">
                    {formatCommentDate(comment.createdAt)}
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-[var(--sf-text)]">
                  {comment.body}
                </p>

                {comment.replies.length > 0 ? (
                  <div className="mt-3 space-y-2 border-l-2 border-[#6f8f84] pl-3">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="rounded-[6px] bg-[var(--sf-surface-soft)] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[12px] font-semibold text-[var(--sf-text)]">
                            Admin · {reply.author_name}
                          </div>
                          <div className="text-[11px] text-[var(--sf-text-muted)]">
                            {formatCommentDate(reply.createdAt)}
                          </div>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-[13px] leading-6 text-[var(--sf-text)]">
                          {reply.body}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {canReplyAsAdmin ? (
                  <div className="mt-3 flex gap-2">
                    <input
                      value={replyDrafts[comment.id] ?? ""}
                      onChange={(event) =>
                        setReplyDrafts((current) => ({
                          ...current,
                          [comment.id]: event.target.value,
                        }))
                      }
                      placeholder="Reply as admin"
                      className="min-w-0 flex-1 rounded-[6px] border border-[var(--sf-border)] px-3 py-2 text-[13px] outline-none focus:border-[#6f8f84]"
                    />
                    <button
                      onClick={() => void handleSubmitReply(comment.id)}
                      title="Send reply"
                      className="flex h-9 w-9 items-center justify-center rounded-[6px] bg-[#33403c] text-white hover:bg-[#202825]"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmitComment} className="border-t border-[var(--sf-border)] p-4">
        {error ? <div className="mb-3 text-[12px] text-red-500">{error}</div> : null}
        <input
          value={authorName}
          onChange={(event) => setAuthorName(event.target.value)}
          placeholder="Your name"
          className="w-full rounded-[6px] border border-[var(--sf-border)] px-3 py-2 text-[13px] outline-none focus:border-[#6f8f84]"
        />
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Write a comment"
          rows={3}
          className="mt-2 w-full resize-none rounded-[6px] border border-[var(--sf-border)] px-3 py-2 text-[13px] outline-none focus:border-[#6f8f84]"
        />
        <button
          disabled={saving || !authorName.trim() || !body.trim()}
          className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-[6px] bg-[#6f8f84] text-[13px] font-semibold text-white hover:bg-[#5d7f73] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          Post comment
        </button>
      </form>
    </aside>
  );
}
