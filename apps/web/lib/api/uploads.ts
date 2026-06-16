import { api } from './client';

type Wrapped<T> = { data: T };

export type ChatImageUploadResult = { url: string };

// Reads a File into a base64 string (without the data: prefix) for the JSON upload
// endpoint, which accepts { fileBuffer, filename, mimeType, roomId? }.
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export const uploadsApi = {
  uploadChatImage: async (file: File, roomId?: string): Promise<ChatImageUploadResult> => {
    const fileBuffer = await fileToBase64(file);
    const res = await api.post<Wrapped<ChatImageUploadResult>>('/uploads/chat', {
      fileBuffer,
      filename: file.name,
      mimeType: file.type,
      roomId,
    });
    return res.data;
  },

  uploadExperienceImage: async (file: File): Promise<ChatImageUploadResult> => {
    const fileBuffer = await fileToBase64(file);
    const res = await api.post<Wrapped<ChatImageUploadResult>>('/uploads/experience', {
      fileBuffer,
      filename: file.name,
      mimeType: file.type,
    });
    return res.data;
  },

  uploadBlogImage: async (file: File): Promise<ChatImageUploadResult> => {
    const fileBuffer = await fileToBase64(file);
    const res = await api.post<Wrapped<ChatImageUploadResult>>('/uploads/blog', {
      fileBuffer,
      filename: file.name,
      mimeType: file.type,
    });
    return res.data;
  },
};
