export const getImageUrl = (url, placeholder = 'https://placehold.co/600x400?text=No+Image') => {
  if (!url) return placeholder;
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  
  let formattedUrl = url;
  if (/^[A-Za-z]:[/\\]/i.test(formattedUrl)) {
    formattedUrl = "/uploads/" + formattedUrl.replace(/\\/g, '/').split('/').pop();
  }

  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const separator = formattedUrl.startsWith('/') ? '' : '/';
  return `${baseUrl}${separator}${formattedUrl}`;
};
