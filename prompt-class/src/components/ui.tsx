import Link from "next/link";
import type { ReactNode } from "react";

/** Title row for a signed-in page, with an optional action on the right. */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-line bg-card ${className}`}>{children}</section>;
}

export function EmptyState({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href?: string;
  cta?: string;
}) {
  return (
    <Panel className="flex flex-col items-center px-6 py-14 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
      {href && cta && (
        <Link href={href} className="btn-primary mt-5">
          {cta}
        </Link>
      )}
    </Panel>
  );
}

/** Shown when someone signed in has no workspace, or the wrong role for a page. */
export function NoAccess({ reason }: { reason: "no-user" | "no-tenant" | "not-staff" }) {
  const copy = {
    "no-user": "Your account isn't set up yet. Ask whoever invited you to check the address they used.",
    "no-tenant": "You aren't a member of any workspace yet. Ask an admin to add you.",
    "not-staff": "This area is for teachers and admins. Your assessments arrive by email invitation.",
  }[reason];
  return <EmptyState title="Nothing to see here yet" body={copy} />;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "ok" | "warn" }) {
  const tones = {
    neutral: "bg-soft text-muted",
    accent: "bg-accent-soft text-accent",
    ok: "bg-soft text-ok",
    warn: "bg-soft text-warn",
  };
  return <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

/** A shaped placeholder: header, then rows where rows are coming. */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse">
      <div className="mb-2 h-7 w-48 rounded bg-soft" />
      <div className="mb-8 h-4 w-72 rounded bg-soft" />
      <Panel className="divide-y divide-line">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <div className="h-4 w-1/3 rounded bg-soft" />
            <div className="h-4 w-20 rounded bg-soft" />
            <div className="ml-auto h-4 w-16 rounded bg-soft" />
          </div>
        ))}
      </Panel>
    </div>
  );
}

/** Column headings for the list tables. */
export function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={`label px-5 py-3 text-left ${className}`}>{children}</th>;
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-5 py-3.5 text-sm ${className}`}>{children}</td>;
}

export function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
