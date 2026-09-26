import type { ImgHTMLAttributes } from "react";

/**
 * Host-uploaded media served by `/api/public/*`. Those routes enforce page access with cookies,
 * so the static image optimizer (which reads build assets only) cannot fetch them.
 */
export function UserImage({ alt, loading = "lazy", decoding = "async", ...rest }: ImgHTMLAttributes<HTMLImageElement> & { alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={alt} loading={loading} decoding={decoding} {...rest} />;
}
