import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ComingSoonPage } from "@shared/ui/common/ComingSoon";
import { requireAuth } from "@/api/require-auth";

const FEATURE_COPY: Record<string, { title: string; description: string }> = {
  "dat-xe-gia-dinh": {
    title: "Đặt xe gia đình",
    description:
      "Đặt xe đưa đón gia đình trong tòa nhà đang được triển khai. Hiện bạn có thể gửi yêu cầu qua mục Dịch vụ & Tiện ích.",
  },
  "goi-uu-dai": {
    title: "Gói dịch vụ ưu đãi",
    description:
      "Gói combo dịch vụ ưu đãi cho cư dân sẽ ra mắt sớm. Theo dõi thông báo từ Ban quản lý để biết khi kích hoạt.",
  },
};

const searchSchema = z.object({
  feature: z.string().optional(),
  back: z.string().optional(),
});

export const Route = createFileRoute("/dang-phat-trien")({
  validateSearch: searchSchema,
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Đang phát triển — STOS Life" }] }),
  component: DangPhatTrienRoute,
});

function DangPhatTrienRoute() {
  const { feature, back } = Route.useSearch();
  const copy = feature ? FEATURE_COPY[feature] : undefined;
  return (
    <ComingSoonPage
      title={copy?.title ?? "Đang phát triển"}
      description={copy?.description}
      back={back ?? "/gia-dinh"}
    />
  );
}
