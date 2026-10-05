
export const shimmer = (w: number, h: number) => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http:
  <defs>
    <!-- Define a linear gradient with three stops for the shimmer effect -->
    <linearGradient id="g">
      <stop stop-color="#cecece" offset="20%" />
      <stop stop-color="#e6e6e6" offset="50%" />
      <stop stop-color="#cecece" offset="70%" />
    </linearGradient>
  </defs>
  <!-- Background rectangle with a solid color -->
  <rect width="${w}" height="${h}" fill="#cecece" />
  <!-- Foreground rectangle with the linear gradient applied -->
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <!-- Animation to move the gradient horizontally across the rectangle -->
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
</svg>`;


export const toBase64 = (str: string) =>
  
  typeof window === "undefined"
    ? 
      Buffer.from(str).toString("base64")
    : 
      window.btoa(str);
