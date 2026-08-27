export const UNSPLASH_DEFAULT = 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80';

export const getImageUrl = (url, placeholder = UNSPLASH_DEFAULT) => {
  if (!url || typeof url !== 'string' || url.includes('placehold.co')) {
    return placeholder;
  }
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  
  let formattedUrl = url;
  if (/^[A-Za-z]:[/\\]/i.test(formattedUrl)) {
    formattedUrl = "/uploads/" + formattedUrl.replace(/\\/g, '/').split('/').pop();
  }

  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const separator = formattedUrl.startsWith('/') ? '' : '/';
  return `${baseUrl}${separator}${formattedUrl}`;
};
