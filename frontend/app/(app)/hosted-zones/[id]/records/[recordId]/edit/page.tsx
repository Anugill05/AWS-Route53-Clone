"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@cloudscape-design/components/box";
import Spinner from "@cloudscape-design/components/spinner";
import { api, ApiError } from "@/lib/api";
import { useNotify } from "@/components/FlashbarContext";
import type { DnsRecord, HostedZone } from "@/lib/types";
import { RecordForm } from "../../RecordForm";

export default function EditRecordPage({
  params,
}: {
  params: Promise<{ id: string; recordId: string }>;
}) {
  const { id, recordId } = use(params);
  const router = useRouter();
  const notify = useNotify();
  const [zone, setZone] = useState<HostedZone | null>(null);
  const [record, setRecord] = useState<DnsRecord | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get<HostedZone>(`/hosted-zones/${id}`),
      api.get<DnsRecord>(`/hosted-zones/${id}/records/${recordId}`),
    ])
      .then(([zoneData, recordData]) => {
        if (!active) return;
        if (recordData.is_default) {
          notify("error", "Default NS and SOA records cannot be edited.");
          router.push(`/hosted-zones/${id}`);
          return;
        }
        setZone(zoneData);
        setRecord(recordData);
      })
      .catch((err) => {
        if (!active) return;
        notify("error", err instanceof ApiError ? err.message : "Failed to load record.");
        router.push(`/hosted-zones/${id}`);
      });
    return () => {
      active = false;
    };
  }, [id, recordId, notify, router]);

  if (!zone || !record) {
    return (
      <Box textAlign="center" padding="xxl">
        <Spinner size="large" />
      </Box>
    );
  }

  return <RecordForm zone={zone} initialRecord={record} />;
}
