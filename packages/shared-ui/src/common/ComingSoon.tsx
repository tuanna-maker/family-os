import { Link } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { MobileShell } from "../mobile/MobileShell";
import { PageHeader } from "./PageHeader";
import { Button } from "../ui/button";

export function ComingSoonPage({
  title = "Đang phát triển",
  description = "Tính năng này sẽ có trong bản cập nhật sắp tới. Cảm ơn bạn đã kiên nhẫn chờ!",
  back = "/gia-dinh",
}: {
  title?: string;
  description?: string;
  back?: string;
}) {
  return (
    <MobileShell>
      <PageHeader title={title} back={back} />
      <section className="px-4 mt-8 flex flex-col items-center text-center">
        <div className="h-20 w-20 rounded-3xl bg-tint-blue grid place-items-center mb-5">
          <Construction className="h-10 w-10 text-brand" />
        </div>
        <p className="text-sm text-muted-foreground max-w-[280px] leading-relaxed">{description}</p>
        <Button asChild className="mt-8 w-full max-w-xs rounded-2xl h-12" variant="outline">
          <Link to={back as never}>Quay lại</Link>
        </Button>
      </section>
    </MobileShell>
  );
}
