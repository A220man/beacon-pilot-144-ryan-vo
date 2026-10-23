export interface User {
  id: number;
  keycloak_sub: string;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: "viewer" | "operator" | "admin";
  created_at: string;
}

export interface Skill {
  id: number;
  owner_id: number;
  name: string;
  slug: string;
  description: string;
  schema_json: string;
  version: string;
  created_at: string;
  updated_at: string;
}

export interface SkillCreate {
  name: string;
  slug: string;
  description: string;
  schema_json?: string;
  version?: string;
}

export interface SkillUpdate {
  name?: string;
  description?: string;
  schema_json?: string;
  version?: string;
}

export interface SkillListResponse {
  items: Skill[];
  total: number;
  page: number;
  page_size: number;
}

export interface Evaluation {
  id: number;
  owner_id: number;
  skill_id: number;
  model_name: string;
  model_version: string;
  status: "pending" | "running" | "completed" | "failed";
  input_data: string;
  result_data: string | null;
  score: number | null;
  confidence_low: number | null;
  confidence_high: number | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface EvaluationCreate {
  skill_id: number;
  model_name: string;
  model_version: string;
  input_data: string;
}

export interface EvaluationListResponse {
  items: Evaluation[];
  total: number;
  page: number;
  page_size: number;
}

export interface Capsule {
  id: number;
  owner_id: number;
  path: string;
  scope: string[];
  evidence: string[];
  invalidated_by: string[];
  claims: Array<{ statement: string; verifier: string }>;
  content: string;
  content_hash: string;
  trusted_content_hash: string | null;
  last_verified_commit: string | null;
  status: "proposed" | "verified" | "stale" | "unknown";
  created_at: string;
  updated_at: string;
}

export interface CapsuleCreate {
  path: string;
  scope: string[];
  evidence: string[];
  invalidated_by?: string[];
  claims?: Array<{ statement: string; verifier: string }>;
  content: string;
}

export interface CapsuleUpdate {
  scope?: string[];
  evidence?: string[];
  invalidated_by?: string[];
  claims?: Array<{ statement: string; verifier: string }>;
  content?: string;
}

export interface CapsuleListResponse {
  items: Capsule[];
  total: number;
  page: number;
  page_size: number;
}

export interface CapsuleFreshness {
  state: "proposed" | "verified" | "stale" | "unknown";
  usable: boolean;
  changed_paths: string[];
  reason?: string;
  error?: string;
  last_verified_commit?: string;
}

export interface AuthUrlResponse {
  auth_url: string;
  state: string;
  nonce: string;
}

export interface OIDCConfig {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  userinfo_endpoint: string;
  end_session_endpoint: string;
}