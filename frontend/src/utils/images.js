export function optimizedImage(url, width = 640) {
  if (typeof url !== "string" || !url.startsWith("https://res.cloudinary.com/")) return url;
  return url.replace("/image/upload/", `/image/upload/c_limit,w_${width}/f_auto/q_auto/`);
}
