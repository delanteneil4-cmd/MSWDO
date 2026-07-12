import { useState } from 'react';

// ─── Cloudinary credentials (shared from DBRVS project) ──────────────────────
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dyobffu4z';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'dbrvs_image';
const COMPRESSIBLE_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const IMAGE_COMPRESSION = {
  maxWidthOrHeight: 1600,
  quality: 0.72,
  minSizeBytes: 300 * 1024,
};

const getCompressedFileName = (name) => {
  const baseName = name.replace(/\.[^/.]+$/, '');
  return `${baseName || 'upload'}-compressed.jpg`;
};

const loadImageSource = async (file) => {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close?.(),
      };
    } catch {
      // Fall through to HTMLImageElement decoding for browsers/files that do not support this path.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.src = objectUrl;
  await image.decode();

  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    cleanup: () => URL.revokeObjectURL(objectUrl),
  };
};

const compressImageFile = async (file) => {
  if (!COMPRESSIBLE_IMAGE_TYPES.includes(file.type) || file.size < IMAGE_COMPRESSION.minSizeBytes) {
    return file;
  }

  let imageSource;
  try {
    imageSource = await loadImageSource(file);
    const { source, width, height } = imageSource;
    const scale = Math.min(1, IMAGE_COMPRESSION.maxWidthOrHeight / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext('2d');
    context.drawImage(source, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', IMAGE_COMPRESSION.quality);
    });

    if (!blob || blob.size >= file.size) return file;

    return new File([blob], getCompressedFileName(file.name), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    imageSource?.cleanup();
  }
};

export const useCloudinaryUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const uploadImage = async (file, folder, onProgress) => {
    if (!file) return null;

    setUploading(true);
    setError(null);

    const uploadFile = await compressImageFile(file);

    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', uploadFile);
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
      const totalFiles = keys.filter(k => filesObj[k] && typeof filesObj[k] !== 'string').length;
      let completedFiles = 0;
      
      const promises = keys.map(async (key) => {
        const file = filesObj[key];
        if (file && typeof file !== 'string') {
          const url = await uploadImage(file, folder, () => {
             // We won't track individual progress for parallel uploads, just completion
          });
          completedFiles++;
          if (onProgress) onProgress(Math.round((completedFiles / totalFiles) * 100));
          urls[key] = url;
        } else {
          urls[key] = file || '';
        }
      });

      await Promise.all(promises);
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
