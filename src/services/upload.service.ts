import type { UploadFolder, UploadImageResponseDto } from "@petcardorg/shared";
import { apiFetch } from "./api";

export function uploadImage(
  token: string,
  file: File,
  folder: UploadFolder,
): Promise<UploadImageResponseDto> {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<UploadImageResponseDto>(`/upload/image?folder=${folder}`, {
    method: "POST",
    body: formData,
    token,
  });
}
