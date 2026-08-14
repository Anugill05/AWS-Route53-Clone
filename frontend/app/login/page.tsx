"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post<User>("/auth/login", { email, password });
      router.push("/hosted-zones");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <Box padding={{ vertical: "xxl" }}>
      <div style={{ maxWidth: 420, margin: "48px auto" }}>
        <SpaceBetween size="l">
          <Box textAlign="center">
            <Box fontSize="heading-xl" fontWeight="bold">
              Route 53 Console Clone
            </Box>
            <Box color="text-body-secondary">Sign in to manage hosted zones and DNS records</Box>
          </Box>

          <Container>
            <form onSubmit={handleSubmit}>
              <Form actions={<Button variant="primary" loading={submitting}>Sign in</Button>}>
                <SpaceBetween size="l">
                  {error && <Alert type="error">{error}</Alert>}
                  <FormField label="Email">
                    <Input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.detail.value)}
                      autoFocus
                    />
                  </FormField>
                  <FormField label="Password">
                    <Input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.detail.value)}
                    />
                  </FormField>
                </SpaceBetween>
              </Form>
            </form>
          </Container>

          <Alert type="info" header="Demo credentials">
            Email: admin@example.com
            <br />
            Password: Admin@12345
          </Alert>
        </SpaceBetween>
      </div>
    </Box>
  );
}
