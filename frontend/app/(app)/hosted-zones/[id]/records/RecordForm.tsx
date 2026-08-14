"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Alert from "@cloudscape-design/components/alert";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Textarea from "@cloudscape-design/components/textarea";
import { api, ApiError } from "@/lib/api";
import { useSetBreadcrumbs } from "@/components/BreadcrumbsContext";
import { useNotify } from "@/components/FlashbarContext";
import { CREATABLE_RECORD_TYPES, type DnsRecord, type HostedZone, type RecordType } from "@/lib/types";

function getSubName(recordName: string, zoneName: string): string {
  if (recordName === zoneName) return "";
  return recordName.slice(0, recordName.length - zoneName.length - 1);
}

function placeholderFor(type: RecordType): string {
  switch (type) {
    case "A":
      return "192.0.2.1";
    case "AAAA":
      return "2001:db8::1";
    case "CNAME":
      return "example.com.";
    case "MX":
      return "10 mail.example.com.";
    case "TXT":
      return '"v=spf1 -all"';
    case "NS":
      return "ns-1.example.com.";
    case "PTR":
      return "example.com.";
    case "SRV":
      return "10 5 5060 sip.example.com.";
    case "CAA":
      return '0 issue "letsencrypt.org"';
    default:
      return "";
  }
}

export function RecordForm({ zone, initialRecord }: { zone: HostedZone; initialRecord?: DnsRecord }) {
  const router = useRouter();
  const notify = useNotify();
  const isEdit = Boolean(initialRecord);

  const [subName, setSubName] = useState(() =>
    initialRecord ? getSubName(initialRecord.name, zone.name) : ""
  );
  const [recordType, setRecordType] = useState<RecordType>(initialRecord?.record_type ?? "A");
  const [ttl, setTtl] = useState(String(initialRecord?.ttl ?? 300));
  const [valuesText, setValuesText] = useState(initialRecord?.values.join("\n") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fullName = subName.trim() ? `${subName.trim()}.${zone.name}` : zone.name;

  useSetBreadcrumbs([
    { text: "Route 53", href: "/hosted-zones" },
    { text: "Hosted zones", href: "/hosted-zones" },
    { text: zone.name, href: `/hosted-zones/${zone.id}` },
    { text: isEdit ? "Edit record" : "Create record", href: "#" },
  ]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const values = valuesText
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);

    try {
      const payload = { name: subName.trim(), record_type: recordType, ttl: Number(ttl), values };
      if (isEdit && initialRecord) {
        await api.put(`/hosted-zones/${zone.id}/records/${initialRecord.id}`, payload);
        notify("success", "Record updated.");
      } else {
        await api.post(`/hosted-zones/${zone.id}/records`, payload);
        notify("success", "Record created.");
      }
      router.push(`/hosted-zones/${zone.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save record.");
      setSubmitting(false);
    }
  }

  return (
    <ContentLayout header={<Header variant="h1">{isEdit ? "Edit record" : "Create record"}</Header>}>
      <Container>
        <form onSubmit={handleSubmit}>
          <Form
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button variant="link" formAction="none" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button variant="primary" formAction="submit" loading={submitting}>
                  {isEdit ? "Save" : "Create record"}
                </Button>
              </SpaceBetween>
            }
          >
            <SpaceBetween size="l">
              {error && <Alert type="error">{error}</Alert>}
              <FormField label="Record name" description={`Resulting record: ${fullName}`}>
                <Input
                  value={subName}
                  onChange={({ detail }) => setSubName(detail.value)}
                  placeholder="www (leave blank for the zone apex)"
                  autoFocus
                />
              </FormField>
              <FormField label="Record type">
                <Select
                  selectedOption={{ label: recordType, value: recordType }}
                  onChange={({ detail }) => setRecordType(detail.selectedOption.value as RecordType)}
                  options={CREATABLE_RECORD_TYPES.map((type) => ({ label: type, value: type }))}
                />
              </FormField>
              <FormField
                label="Routing policy"
                description="Only Simple routing is supported in this demo."
              >
                <Select
                  selectedOption={{ label: "Simple routing", value: "simple" }}
                  onChange={() => {}}
                  options={[{ label: "Simple routing", value: "simple" }]}
                  disabled
                />
              </FormField>
              <FormField
                label="Value/Route traffic to"
                description="Enter one value per line. Multiple values are supported for record types such as A or MX."
              >
                <Textarea
                  value={valuesText}
                  onChange={({ detail }) => setValuesText(detail.value)}
                  rows={5}
                  placeholder={placeholderFor(recordType)}
                />
              </FormField>
              <FormField label="TTL (seconds)">
                <Input type="number" value={ttl} onChange={({ detail }) => setTtl(detail.value)} />
              </FormField>
            </SpaceBetween>
          </Form>
        </form>
      </Container>
    </ContentLayout>
  );
}
