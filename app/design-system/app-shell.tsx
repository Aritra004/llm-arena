"use client";

import { Show, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Brand } from "./brand";
import { Icon, type IconName } from "./icons";

type NavigationItem = Readonly<{
  href: string;
  icon: IconName;
  label: string;
}>;

const navigation: readonly NavigationItem[] = [
  { href: "/", icon: "arena", label: "Arena" },
  { href: "/leaderboard", icon: "leaderboard", label: "Leaderboard" },
  { href: "/models", icon: "models", label: "Models" },
  { href: "/history", icon: "history", label: "History" },
];

function isCurrentPath(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}

function NavigationLink({ href, icon, label }: NavigationItem) {
  const pathname = usePathname();
  const isCurrent = isCurrentPath(pathname, href);

  return (
    <Link
      className="navigation-link"
      href={href}
      aria-current={isCurrent ? "page" : undefined}
    >
      <Icon className="navigation-icon" name={icon} />
      <span>{label}</span>
    </Link>
  );
}

function AccountControl() {
  const { user } = useUser();

  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button className="account-button" type="button">
            <span className="account-avatar" aria-hidden="true">
              <Icon name="user" />
            </span>
            <span>
              <strong>Guest session</strong>
              <small>Sign in to vote</small>
            </span>
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <div className="account-button account-button-signed-in">
          <UserButton />
          <span>
            <strong>
              {user?.fullName ??
                user?.primaryEmailAddress?.emailAddress ??
                "Account"}
            </strong>
            <small>Signed in</small>
          </span>
        </div>
      </Show>
    </>
  );
}

function MobileAccountControl() {
  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button className="icon-button" type="button" aria-label="Sign in">
            <Icon name="user" />
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </>
  );
}

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();

  const isScrollableArenaPage =
    pathname === "/leaderboard" ||
    pathname === "/models" ||
    pathname === "/history" ||
    pathname.startsWith("/history/");

  if (pathname === "/" || isScrollableArenaPage) {
    return (
      <div
        className={`app-shell arena-shell${isScrollableArenaPage ? " arena-shell-scrollable" : ""}`}
      >
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <header className="arena-topbar">
          <Brand />
          <nav className="arena-navigation" aria-label="Primary navigation">
            {navigation.map((item) => (
              <NavigationLink key={item.href} {...item} />
            ))}
          </nav>
          <div className="arena-account">
            <MobileAccountControl />
          </div>
        </header>
        <main
          className={`arena-main${isScrollableArenaPage ? " arena-main-scrollable" : ""}`}
          id="main-content"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <aside className="sidebar">
        <Brand />
        <nav className="primary-navigation" aria-label="Primary navigation">
          {navigation.map((item) => (
            <NavigationLink key={item.href} {...item} />
          ))}
        </nav>
        <div className="sidebar-foot">
          <AccountControl />
        </div>
      </aside>

      <div className="mobile-topbar">
        <Brand />
        <MobileAccountControl />
      </div>

      <main className="main-content" id="main-content" tabIndex={-1}>
        {children}
      </main>

      <nav className="mobile-navigation" aria-label="Primary navigation">
        {navigation.map((item) => (
          <NavigationLink key={item.href} {...item} />
        ))}
      </nav>
    </div>
  );
}
