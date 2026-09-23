import { type Page, apiClient } from "@/core/api";

/** Mirrors backend/app/schemas/note.py — timestamps are ISO datetime strings. */
export type Note = {
  id: number;
  title: string;
  content: string;
  owner_id: number;
  created_at: string;
  updated_at: string;
};

export type NoteCreate = {
  /** 1–200 characters. */
  title: string;
  /** Defaults to "" on the backend. */
  content?: string;
};

export type NoteUpdate = {
  title?: string;
  content?: string;
};

export type NotesQuery = {
  /** Page size, 1–100 (backend default 20). */
  limit?: number;
  /** Items to skip, >= 0. */
  offset?: number;
};

export const listNotes = async (
  query: NotesQuery = {}
): Promise<Page<Note>> => {
  const { data } = await apiClient.get<Page<Note>>("/notes", { params: query });
  return data;
};

export const getNote = async (id: number): Promise<Note> => {
  const { data } = await apiClient.get<Note>(`/notes/${id}`);
  return data;
};

export const createNote = async (input: NoteCreate): Promise<Note> => {
  const { data } = await apiClient.post<Note>("/notes", input);
  return data;
};

export const updateNote = async (
  id: number,
  patch: NoteUpdate
): Promise<Note> => {
  const { data } = await apiClient.patch<Note>(`/notes/${id}`, patch);
  return data;
};

export const deleteNote = async (id: number): Promise<void> => {
  await apiClient.delete(`/notes/${id}`);
};
