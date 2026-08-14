"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@cloudscape-design/components/box";
import Spinner from "@cloudscape-design/components/spinner";
import { api, ApiError } from "@/lib/api";
import { useNotify } from "@/components/FlashbarContext";
import type { HostedZone } from "@/lib/types";
import { RecordForm } from "../RecordForm";

export default function NewRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const notify = useNotify();
  const [zone, setZone] = useState<HostedZone | null>(null);

  useEffect(() => {
    api
      .get<HostedZone>(`/hosted-zones/${id}`)
      .then(setZone)
      .catch((err) => {
        notify("error", err instanceof ApiError ? err.message : "Failed to load hosted zone.");
        router.push("/hosted-zones");
      });
  }, [id, notify, router]);

  if (!zone) {
    return (
      <Box textAlign="center" padding="xxl">
        <Spinner size="large" />
      </Box>
    );
  }

  return <RecordForm zone={zone} />;
}
