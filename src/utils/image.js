export const getImageUrl = (url, placeholder = 'https://placehold.co/600x400?text=No+Image') => {
  if (!url) return placeholder;
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const separator = url.startsWith('/') ? '' : '/';
  return `${baseUrl}${separator}${url}`;
};
