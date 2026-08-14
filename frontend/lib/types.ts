export type ZoneType = "Public" | "Private";

export type RecordType =
  | "A"
  | "AAAA"
  | "CNAME"
  | "TXT"
  | "MX"
  | "NS"
  | "PTR"
  | "SRV"
  | "CAA"
  | "SOA";

export const CREATABLE_RECORD_TYPES: RecordType[] = [
  "A",
  "AAAA",
  "CNAME",
  "TXT",
  "MX",
  "NS",
  "PTR",
  "SRV",
  "CAA",
];

export const ALL_RECORD_TYPES: RecordType[] = [...CREATABLE_RECORD_TYPES, "SOA"];

export interface User {
  id: number;
  email: string;
  name: string;
}

export interface HostedZone {
  id: string;
  name: string;
  comment: string | null;
  zone_type: ZoneType;
  record_count: number;
  created_at: string;
  updated_at: string;
}

export interface DnsRecord {
  id: number;
  hosted_zone_id: string;
  name: string;
  record_type: RecordType;
  ttl: number;
  values: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
}
