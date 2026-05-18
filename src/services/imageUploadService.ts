const PUBLIC_KEY = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY as string;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';

interface ImageKitAuthResponse {
  token: string;
  expire: number;
  signature: string;
}

interface ImageKitUploadResponse {
  url: string;
  fileId: string;
  name: string;
}

export async function uploadImageToImageKit(file: File, folder = 'uploads'): Promise<string> {
  const authRes = await fetch(`${API_BASE_URL}/imagekit-auth`);
  if (!authRes.ok) {
    throw new Error('Failed to get ImageKit auth credentials');
  }
  const auth: ImageKitAuthResponse = await authRes.json();

  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileName', `${Date.now()}_${file.name}`);
  formData.append('publicKey', PUBLIC_KEY);
  formData.append('signature', auth.signature);
  formData.append('expire', String(auth.expire));
  formData.append('token', auth.token);
  formData.append('folder', folder);

  const uploadRes = await fetch(IMAGEKIT_UPLOAD_URL, {
    method: 'POST',
    body: formData,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`ImageKit upload failed: ${err}`);
  }

  const data: ImageKitUploadResponse = await uploadRes.json();
  return data.url;
}
