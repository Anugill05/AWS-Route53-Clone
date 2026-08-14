"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import Link from "@cloudscape-design/components/link";
import Modal from "@cloudscape-design/components/modal";
import Pagination from "@cloudscape-design/components/pagination";
import RadioGroup from "@cloudscape-design/components/radio-group";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Table from "@cloudscape-design/components/table";
import Textarea from "@cloudscape-design/components/textarea";
import TextFilter from "@cloudscape-design/components/text-filter";
import { api, ApiError } from "@/lib/api";
import { useSetBreadcrumbs } from "@/components/BreadcrumbsContext";
import { useNotify } from "@/components/FlashbarContext";
import type { HostedZone, ListResponse, ZoneType } from "@/lib/types";

const PAGE_SIZE = 10;

export default function HostedZonesPage() {
  const router = useRouter();
  const notify = useNotify();

  useSetBreadcrumbs([
    { text: "Route 53", href: "/hosted-zones" },
    { text: "Hosted zones", href: "/hosted-zones" },
  ]);

  const [zones, setZones] = useState<HostedZone[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<HostedZone[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchZones = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      const data = await api.get<ListResponse<HostedZone>>(`/hosted-zones?${params.toString()}`);
      setZones(data.items);
      setTotal(data.total);
    } catch (err) {
      notify("error", err instanceof ApiError ? err.message : "Failed to load hosted zones.");
    } finally {
      setLoading(false);
    }
  }, [page, search, notify]);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const selected = selectedItems[0];

  function afterMutation(message: string) {
    notify("success", message);
    setSelectedItems([]);
    fetchZones();
  }

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          counter={`(${total})`}
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button disabled={!selected} onClick={() => setEditOpen(true)}>
                Edit hosted zone
              </Button>
              <Button disabled={!selected} onClick={() => setDeleteOpen(true)}>
                Delete
              </Button>
              <Button variant="primary" onClick={() => setCreateOpen(true)}>
                Create hosted zone
              </Button>
            </SpaceBetween>
          }
        >
          Hosted zones
        </Header>
      }
    >
      <Table<HostedZone>
        columnDefinitions={[
          {
            id: "name",
            header: "Domain name",
            cell: (item) => (
              <Link
                href={`/hosted-zones/${item.id}`}
                onFollow={(event) => {
                  event.preventDefault();
                  router.push(`/hosted-zones/${item.id}`);
                }}
              >
                {item.name}
              </Link>
            ),
          },
          { id: "type", header: "Type", cell: (item) => item.zone_type },
          { id: "record_count", header: "Record count", cell: (item) => item.record_count },
          { id: "comment", header: "Comment", cell: (item) => item.comment || "-" },
          {
            id: "created_at",
            header: "Created on",
            cell: (item) => new Date(item.created_at).toLocaleDateString(),
          },
        ]}
        items={zones}
        trackBy="id"
        loading={loading}
        loadingText="Loading hosted zones"
        selectionType="single"
        selectedItems={selectedItems}
        onSelectionChange={({ detail }) => setSelectedItems(detail.selectedItems)}
        empty={
          <Box textAlign="center" color="inherit" padding="l">
            <SpaceBetween size="s">
              <b>No hosted zones</b>
              <Box variant="p" color="text-body-secondary">
                Create a hosted zone to start managing DNS records.
              </Box>
              <Button onClick={() => setCreateOpen(true)}>Create hosted zone</Button>
            </SpaceBetween>
          </Box>
        }
        filter={
          <TextFilter
            filteringText={searchInput}
            filteringPlaceholder="Find hosted zone"
            filteringAriaLabel="Find hosted zone"
            onChange={({ detail }) => setSearchInput(detail.filteringText)}
          />
        }
        pagination={
          <Pagination
            currentPageIndex={page}
            pagesCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
            onChange={({ detail }) => setPage(detail.currentPageIndex)}
          />
        }
      />

      {createOpen && (
        <CreateZoneModal
          onDismiss={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            setPage(1);
            afterMutation("Hosted zone created.");
          }}
        />
      )}

      {editOpen && selected && (
        <EditZoneModal
          zone={selected}
          onDismiss={() => setEditOpen(false)}
          onUpdated={() => {
            setEditOpen(false);
            afterMutation("Hosted zone updated.");
          }}
        />
      )}

      {deleteOpen && selected && (
        <DeleteZoneModal
          zone={selected}
          onDismiss={() => setDeleteOpen(false)}
          onDeleted={() => {
            setDeleteOpen(false);
            afterMutation("Hosted zone deleted.");
          }}
        />
      )}
    </ContentLayout>
  );
}

function CreateZoneModal({ onDismiss, onCreated }: { onDismiss: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [zoneType, setZoneType] = useState<ZoneType>("Public");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await api.post<HostedZone>("/hosted-zones", { name, comment: comment || null, zone_type: zoneType });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create hosted zone.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      visible
      onDismiss={onDismiss}
      header="Create hosted zone"
      closeAriaLabel="Close"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onDismiss}>
              Cancel
            </Button>
            <Button variant="primary" loading={submitting} disabled={!name.trim()} onClick={handleSubmit}>
              Create hosted zone
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <Form>
        <SpaceBetween size="l">
          {error && <Alert type="error">{error}</Alert>}
          <FormField label="Domain name" description="The domain name for which you want to route traffic.">
            <Input value={name} onChange={({ detail }) => setName(detail.value)} placeholder="example.com" autoFocus />
          </FormField>
          <FormField label="Type">
            <RadioGroup
              value={zoneType}
              onChange={({ detail }) => setZoneType(detail.value as ZoneType)}
              items={[
                { value: "Public", label: "Public hosted zone", description: "Routes traffic on the internet." },
                { value: "Private", label: "Private hosted zone", description: "Routes traffic within a VPC." },
              ]}
            />
          </FormField>
          <FormField label="Comment - optional">
            <Textarea value={comment} onChange={({ detail }) => setComment(detail.value)} rows={3} />
          </FormField>
        </SpaceBetween>
      </Form>
    </Modal>
  );
}

function EditZoneModal({
  zone,
  onDismiss,
  onUpdated,
}: {
  zone: HostedZone;
  onDismiss: () => void;
  onUpdated: () => void;
}) {
  const [comment, setComment] = useState(zone.comment ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await api.put<HostedZone>(`/hosted-zones/${zone.id}`, { comment: comment || null });
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update hosted zone.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      visible
      onDismiss={onDismiss}
      header="Edit hosted zone"
      closeAriaLabel="Close"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onDismiss}>
              Cancel
            </Button>
            <Button variant="primary" loading={submitting} onClick={handleSubmit}>
              Save
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <Form>
        <SpaceBetween size="l">
          {error && <Alert type="error">{error}</Alert>}
          <FormField label="Domain name">
            <Input value={zone.name} disabled />
          </FormField>
          <FormField label="Comment - optional">
            <Textarea value={comment} onChange={({ detail }) => setComment(detail.value)} rows={3} autoFocus />
          </FormField>
        </SpaceBetween>
      </Form>
    </Modal>
  );
}

function DeleteZoneModal({
  zone,
  onDismiss,
  onDeleted,
}: {
  zone: HostedZone;
  onDismiss: () => void;
  onDeleted: () => void;
}) {
  const expectedName = zone.name.replace(/\.$/, "");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleDelete() {
    setSubmitting(true);
    setError(null);
    try {
      await api.del(`/hosted-zones/${zone.id}`);
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete hosted zone.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      visible
      onDismiss={onDismiss}
      header="Delete hosted zone"
      closeAriaLabel="Close"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onDismiss}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={submitting}
              disabled={confirmText !== expectedName}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="l">
        {error && <Alert type="error">{error}</Alert>}
        <Alert type="warning">
          You can&apos;t recover this hosted zone after you delete it. All non-default records must be
          deleted first.
        </Alert>
        <FormField label={<>To confirm deletion, type the domain name in the field.</>}>
          <Input value={confirmText} onChange={({ detail }) => setConfirmText(detail.value)} placeholder={expectedName} />
        </FormField>
      </SpaceBetween>
    </Modal>
  );
}
