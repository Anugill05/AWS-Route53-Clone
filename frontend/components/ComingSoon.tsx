"use client";

import { usePathname } from "next/navigation";
import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useSetBreadcrumbs } from "@/components/BreadcrumbsContext";

export function ComingSoon({ title, description }: { title: string; description?: string }) {
  const pathname = usePathname();

  useSetBreadcrumbs([
    { text: "Route 53", href: "/hosted-zones" },
    { text: title, href: pathname },
  ]);

  return (
    <ContentLayout header={<Header variant="h1">{title}</Header>}>
      <Container>
        <SpaceBetween size="l">
          <Box textAlign="center" padding="xxl">
            <SpaceBetween size="s">
              <Box variant="strong" fontSize="heading-m">
                This feature is not available in this demo.
              </Box>
              <Box variant="p" color="text-body-secondary">
                {description ?? `${title} is mocked for this project and is not implemented yet.`}
              </Box>
            </SpaceBetween>
          </Box>
          <Alert type="info">
            This is a UI/UX clone built for demonstration purposes only. This section does not
            perform any real actions.
          </Alert>
        </SpaceBetween>
      </Container>
    </ContentLayout>
  );
}
