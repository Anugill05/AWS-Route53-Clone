"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import AppLayout from "@cloudscape-design/components/app-layout";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import Button from "@cloudscape-design/components/button";
import Flashbar from "@cloudscape-design/components/flashbar";
import Input from "@cloudscape-design/components/input";
import Spinner from "@cloudscape-design/components/spinner";
import SideNavigation from "@cloudscape-design/components/side-navigation";
import TopNavigation from "@cloudscape-design/components/top-navigation";
import Box from "@cloudscape-design/components/box";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";
import { AuthProvider } from "@/components/AuthContext";
import { BreadcrumbsProvider, useBreadcrumbItems } from "@/components/BreadcrumbsContext";
import { FlashbarProvider, useFlashbarItems } from "@/components/FlashbarContext";

const NAV_ITEMS: SideNavigationItems = [
  { type: "link", text: "Dashboard", href: "/dashboard" },
  { type: "divider" },
  {
    type: "section",
    text: "DNS management",
    defaultExpanded: true,
    items: [
      { type: "link", text: "Hosted zones", href: "/hosted-zones" },
      { type: "link", text: "Traffic policies", href: "/traffic-policies" },
      { type: "link", text: "Health checks", href: "/health-checks" },
      { type: "link", text: "Resolver", href: "/resolver" },
    ],
  },
  { type: "divider" },
  { type: "link", text: "Profiles", href: "/profiles" },
];

// Local alias to keep the array literal above readable without importing the namespace type inline.
type SideNavigationItems = React.ComponentProps<typeof SideNavigation>["items"];

function AppShell({ user, children }: { user: User; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const flashItems = useFlashbarItems();
  const breadcrumbItems = useBreadcrumbItems();

  async function handleSignOut() {
    await api.post("/auth/logout");
    router.push("/login");
  }

  return (
    <>
      <div id="top-navigation">
        <TopNavigation
          identity={{
            href: "/hosted-zones",
            logo: { src: "/logo.svg", alt: "Console Clone" },
          }}
          search={
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ minWidth: 240 }}>
                <Input type="search" value="" onChange={() => {}} placeholder="Search" ariaLabel="Search" />
              </div>
              <span title="Coming soon" style={{ display: "inline-flex" }}>
                <Button variant="icon" iconName="notification" ariaLabel="Notifications" />
              </span>
              <span title="Coming soon" style={{ display: "inline-flex" }}>
                <Button variant="icon" iconName="status-info" ariaLabel="Help" />
              </span>
            </div>
          }
          utilities={[
            { type: "button", text: "Global", title: "Route 53 is a global service" },
            {
              type: "menu-dropdown",
              text: user.name,
              description: user.email,
              iconName: "user-profile",
              items: [{ id: "signout", text: "Sign out" }],
              onItemClick: ({ detail }) => {
                if (detail.id === "signout") {
                  handleSignOut();
                }
              },
            },
          ]}
        />
      </div>
      <AppLayout
        headerSelector="#top-navigation"
        toolsHide
        navigation={
          <SideNavigation
            header={{ text: "Route 53", href: "/hosted-zones" }}
            activeHref={pathname}
            items={NAV_ITEMS}
            onFollow={(event) => {
              if (!event.detail.external) {
                event.preventDefault();
                router.push(event.detail.href);
              }
            }}
          />
        }
        notifications={<Flashbar items={flashItems} />}
        breadcrumbs={
          breadcrumbItems.length > 0 ? (
            <BreadcrumbGroup
              items={breadcrumbItems}
              onFollow={(event) => {
                event.preventDefault();
                router.push(event.detail.href);
              }}
            />
          ) : undefined
        }
        content={children}
      />
    </>
  );
}

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get<User>("/auth/me")
      .then((current) => {
        if (active) {
          setUser(current);
          setChecked(true);
        }
      })
      .catch((err) => {
        if (active && err instanceof ApiError && err.status === 401) {
          router.replace("/login");
        }
      });
    return () => {
      active = false;
    };
  }, [router]);

  if (!checked || !user) {
    return (
      <Box textAlign="center" padding="xxl">
        <Spinner size="large" />
      </Box>
    );
  }

  return (
    <AuthProvider user={user}>
      <BreadcrumbsProvider>
        <FlashbarProvider>
          <AppShell user={user}>{children}</AppShell>
        </FlashbarProvider>
      </BreadcrumbsProvider>
    </AuthProvider>
  );
}
