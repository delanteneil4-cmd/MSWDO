import { useState } from 'react';

// ─── Cloudinary credentials (shared from DBRVS project) ──────────────────────
const CLOUD_NAME = 'dyobffu4z';
const UPLOAD_PRESET = 'dbrvs_image';

export const useCloudinaryUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const uploadImage = async (file, folder, onProgress) => {
    if (!file) return null;

    setUploading(true);
    setError(null);

    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      if (folder) formData.append('folder', folder);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.onload = () => {
        setUploading(false);
        if (xhr.status === 200) {
          const res = JSON.parse(xhr.responseText);
          resolve(res.secure_url);
        } else {
          const err = new Error('Upload failed. Please check your connection and try again.');
          setError(err.message);
          reject(err);
        }
      };

      xhr.onerror = () => {
        setUploading(false);
        const err = new Error('Network error during upload.');
        setError(err.message);
        reject(err);
      };

      xhr.send(formData);
    });
  };

  const uploadMultiple = async (filesObj, folder, onProgress) => {
    setUploading(true);
    setError(null);
    try {
      const urls = {};
      const keys = Object.keys(filesObj);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const file = filesObj[key];
        if (file && typeof file !== 'string') {
          urls[key] = await uploadImage(file, folder, (pct) => {
            // weighted progress across all files
            if (onProgress) onProgress(Math.round(((i + pct / 100) / keys.length) * 100));
          });
        } else {
          urls[key] = file || '';
        }
      }
      return urls;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return { uploadImage, uploadMultiple, uploading, error };
};
