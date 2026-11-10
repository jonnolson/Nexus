import {
  BookHeart,
  FolderKanban,
  HandCoins,
  LayoutDashboard,
  ListChecks,
  NotebookPen,
  Receipt,
  Signature,
  Timer,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Flip to true when the module ships; until then it renders as "Soon". */
  ready: boolean;
};

export type NavSection = { title?: string; items: NavItem[] };

export const navSections: NavSection[] = [
  {
    items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard, ready: true }],
  },
  {
    title: "Studio",
    items: [
      { label: "Clients", href: "/clients", icon: Users, ready: true },
      { label: "Projects", href: "/projects", icon: FolderKanban, ready: true },
      { label: "Tasks", href: "/tasks", icon: ListChecks, ready: true },
      { label: "Time", href: "/time", icon: Timer, ready: true },
      { label: "Invoices", href: "/invoices", icon: Receipt, ready: true },
      { label: "Contracts", href: "/contracts", icon: Signature, ready: false },
    ],
  },
  {
    title: "Accounting",
    items: [
      { label: "Income", href: "/income", icon: HandCoins, ready: true },
      { label: "Expenses", href: "/expenses", icon: Wallet, ready: true },
    ],
  },
  {
    title: "Notes",
    items: [
      { label: "Work", href: "/notes/work", icon: NotebookPen, ready: true },
      { label: "Personal", href: "/notes/personal", icon: BookHeart, ready: true },
    ],
  },
];
