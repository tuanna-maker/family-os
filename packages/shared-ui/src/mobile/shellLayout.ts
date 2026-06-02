/**
 * Lớp layout dùng chung cho mọi shell (Family Core, Security Core, ...).
 * Đảm bảo max-width và spacing đồng nhất ở mọi breakpoint ≥ md.
 */
export const SHELL_OUTER = "min-h-dvh bg-background md:pl-64";
export const SHELL_CONTAINER =
  "mx-auto w-full max-w-md md:max-w-3xl lg:max-w-5xl xl:max-w-6xl min-h-dvh pb-[calc(7rem+env(safe-area-inset-bottom,0px))] md:pb-12 md:px-8 lg:px-10";
/** Padding top cho header mobile — tránh notch / Dynamic Island */
export const MOBILE_HEADER_PT =
  "pt-[max(1.25rem,env(safe-area-inset-top,0px))]";
