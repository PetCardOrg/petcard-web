import { apiFetch } from "./api";

export type UploadFolder = "pets" | "tutors" | "vets";

export function uploadImage(
  token: string,
  file: File,
  folder: UploadFolder,
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<{ url: string }>(`/upload/image?folder=${folder}`, {
    method: "POST",
    body: formData,
    token,
  });
}
