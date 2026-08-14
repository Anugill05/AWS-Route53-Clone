"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@cloudscape-design/components/alert";
import Badge from "@cloudscape-design/components/badge";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import KeyValuePairs from "@cloudscape-design/components/key-value-pairs";
import Modal from "@cloudscape-design/components/modal";
import Pagination from "@cloudscape-design/components/pagination";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Spinner from "@cloudscape-design/components/spinner";
import Table from "@cloudscape-design/components/table";
import TextFilter from "@cloudscape-design/components/text-filter";
import { api, ApiError } from "@/lib/api";
import { useSetBreadcrumbs } from "@/components/BreadcrumbsContext";
import { useNotify } from "@/components/FlashbarContext";
import { ALL_RECORD_TYPES, type DnsRecord, type HostedZone, type ListResponse, type RecordType } from "@/lib/types";

const PAGE_SIZE = 10;

export default function HostedZoneDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const notify = useNotify();

  const [zone, setZone] = useState<HostedZone | null>(null);
  const [zoneLoading, setZoneLoading] = useState(true);

  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<RecordType | "">("");
  const [page, setPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<DnsRecord[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchZone = useCallback(async () => {
    setZoneLoading(true);
    try {
      const data = await api.get<HostedZone>(`/hosted-zones/${id}`);
      setZone(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        notify("error", "Hosted zone not found.");
        router.push("/hosted-zones");
      } else {
        notify("error", "Failed to load hosted zone.");
      }
    } finally {
      setZoneLoading(false);
    }
  }, [id, notify, router]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      if (typeFilter) params.set("type", typeFilter);
      const data = await api.get<ListResponse<DnsRecord>>(`/hosted-zones/${id}/records?${params.toString()}`);
      setRecords(data.items);
      setTotal(data.total);
    } catch (err) {
      notify("error", err instanceof ApiError ? err.message : "Failed to load records.");
    } finally {
      setLoading(false);
    }
  }, [id, page, search, typeFilter, notify]);

  useEffect(() => {
    fetchZone();
  }, [fetchZone]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useSetBreadcrumbs([
    { text: "Route 53", href: "/hosted-zones" },
    { text: "Hosted zones", href: "/hosted-zones" },
    { text: zone?.name ?? id, href: `/hosted-zones/${id}` },
  ]);

  const selected = selectedItems[0];

  if (zoneLoading || !zone) {
    return (
      <Box textAlign="center" padding="xxl">
        <Spinner size="large" />
      </Box>
    );
  }

  return (
    <ContentLayout header={<Header variant="h1">{zone.name}</Header>}>
      <SpaceBetween size="l">
        <Container header={<Header variant="h2">Hosted zone details</Header>}>
          <KeyValuePairs
            columns={3}
            items={[
              { label: "Hosted zone ID", value: zone.id },
              { label: "Type", value: zone.zone_type },
              { label: "Record count", value: String(zone.record_count) },
              { label: "Comment", value: zone.comment || "-" },
            ]}
          />
        </Container>

        <Table<DnsRecord>
          header={
            <Header
              counter={`(${total})`}
              actions={
                <SpaceBetween direction="horizontal" size="xs">
                  <Button
                    disabled={!selected}
                    onClick={() => selected && router.push(`/hosted-zones/${id}/records/${selected.id}/edit`)}
                  >
                    Edit record
                  </Button>
                  <Button disabled={!selected} onClick={() => setDeleteOpen(true)}>
                    Delete
                  </Button>
                  <Button variant="primary" onClick={() => router.push(`/hosted-zones/${id}/records/new`)}>
                    Create record
                  </Button>
                </SpaceBetween>
              }
            >
              Records
            </Header>
          }
          columnDefinitions={[
            { id: "name", header: "Record name", cell: (item) => item.name },
            { id: "type", header: "Type", cell: (item) => <Badge>{item.record_type}</Badge> },
            { id: "routing_policy", header: "Routing policy", cell: () => "Simple" },
            { id: "ttl", header: "TTL (seconds)", cell: (item) => item.ttl },
            {
              id: "value",
              header: "Value/Route traffic to",
              cell: (item) => (
                <SpaceBetween size="xxs">
                  {item.values.map((value, index) => (
                    <div key={index}>{value}</div>
                  ))}
                </SpaceBetween>
              ),
            },
            {
              id: "default",
              header: "Default",
              cell: (item) => (item.is_default ? <Badge color="grey">Default</Badge> : "-"),
            },
          ]}
          items={records}
          trackBy="id"
          loading={loading}
          loadingText="Loading records"
          selectionType="single"
          selectedItems={selectedItems}
          isItemDisabled={(item) => item.is_default}
          onSelectionChange={({ detail }) => setSelectedItems(detail.selectedItems)}
          empty={
            <Box textAlign="center" color="inherit" padding="l">
              No records found.
            </Box>
          }
          filter={
            <SpaceBetween direction="horizontal" size="xs">
              <TextFilter
                filteringText={searchInput}
                filteringPlaceholder="Find record"
                filteringAriaLabel="Find record"
                onChange={({ detail }) => setSearchInput(detail.filteringText)}
              />
              <Select
                selectedOption={
                  typeFilter ? { label: typeFilter, value: typeFilter } : { label: "All types", value: "" }
                }
                onChange={({ detail }) => {
                  setPage(1);
                  setTypeFilter((detail.selectedOption.value as RecordType) || "");
                }}
                options={[{ label: "All types", value: "" }, ...ALL_RECORD_TYPES.map((t) => ({ label: t, value: t }))]}
              />
            </SpaceBetween>
          }
          pagination={
            <Pagination
              currentPageIndex={page}
              pagesCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
              onChange={({ detail }) => setPage(detail.currentPageIndex)}
            />
          }
        />
      </SpaceBetween>

      {deleteOpen && selected && (
        <DeleteRecordModal
          zoneId={id}
          record={selected}
          onDismiss={() => setDeleteOpen(false)}
          onDeleted={() => {
            setDeleteOpen(false);
            setSelectedItems([]);
            notify("success", "Record deleted.");
            fetchRecords();
            fetchZone();
          }}
        />
      )}
    </ContentLayout>
  );
}

function DeleteRecordModal({
  zoneId,
  record,
  onDismiss,
  onDeleted,
}: {
  zoneId: string;
  record: DnsRecord;
  onDismiss: () => void;
  onDeleted: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleDelete() {
    setSubmitting(true);
    setError(null);
    try {
      await api.del(`/hosted-zones/${zoneId}/records/${record.id}`);
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete record.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      visible
      onDismiss={onDismiss}
      header="Delete record"
      closeAriaLabel="Close"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onDismiss}>
              Cancel
            </Button>
            <Button variant="primary" loading={submitting} onClick={handleDelete}>
              Delete
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="l">
        {error && <Alert type="error">{error}</Alert>}
        <Box>
          Delete record <b>{record.name}</b> ({record.record_type})? This action cannot be undone.
        </Box>
      </SpaceBetween>
    </Modal>
  );
}
