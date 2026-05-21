"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  CalendarCheck,
  Wrench,
  Package,
  HelpCircle,
  Settings,
  Menu,
  X,
  InspectionPanel,
  LogOut,
  ReceiptText,
  HandFist,
  Podcast,
  Handshake,
  ChevronDown,
  ChevronRight,
  Globe,
  Calendar1,
  UserPlus,
  CloudUpload,
  FileQuestionMark,
} from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { signOut } from "next-auth/react";

const topNavigation = [
  { name: "Dashboard Overview", href: "/", icon: LayoutDashboard },
];

const navigation = [
  { name: "Products Management", href: "/products", icon: Wrench },
  {
    name: "Controls & Extras Management",
    href: "/controls-extras",
    icon: Package,
  },
  { name: "Subscriber Management", href: "/subscribers", icon: Podcast },
  { name: "Settings", href: "/settings", icon: Settings },
];

const crmManagementItems = [
  { name: "Quote Management", href: "/quotes", icon: FileText },
  { name: "Booking Management", href: "/bookings", icon: CalendarCheck },
  {
    name: "Menually Quote Management",
    href: "/menually-quotes",
    icon: Calendar1,
  },
  { name: "Add New Customer", href: "/customers", icon: UserPlus },
];

const websiteManagementItems = [
  { name: "Update Logo", href: "/update-logo", icon: CloudUpload },
  { name: "Hero section", href: "/hero", icon: InspectionPanel },
  { name: "Our Partners", href: "/our-partners", icon: Handshake },
  { name: "How it works", href: "/how-it-works", icon: FileText },
  { name: "Promise Section", href: "/promise", icon: HandFist },

  { name: "About Hero section", href: "/about-hero", icon: InspectionPanel },
  {
    name: "About Our Values section",
    href: "/about-our-values",
    icon: FileText,
  },

  { name: "Privacy Policy", href: "/privacy-policy", icon: ReceiptText },
  { name: "Terms & Conditions", href: "/terms-conditions", icon: Handshake },
  { name: "FAQ Management", href: "/faq", icon: HelpCircle },
  {
    name: "Newsletter Management",
    href: "/newsletter-management",
    icon: HelpCircle,
  },
  {
    name: "Raise an issue",
    href: "/raise-an-issue",
    icon: FileQuestionMark ,
  },


  {
    name: "Sales",
    href: "/sales",
    icon: FileQuestionMark ,
  },
    {
    name: "Aftercare",
    href: "/aftercare",
    icon: FileQuestionMark ,
  },
    {
    name: "Engineer",
    href: "/engineer",
    icon: FileQuestionMark ,
  },

];



export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isCrmManagementOpen, setIsCrmManagementOpen] = useState(false);
  const [isWebsiteManagementOpen, setIsWebsiteManagementOpen] = useState(false);

  const isCrmManagementActive = crmManagementItems.some(
    (item) =>
      pathname === item.href ||
      (item.href !== "/" && pathname.startsWith(item.href)),
  );

  const isWebsiteManagementActive = websiteManagementItems.some(
    (item) =>
      pathname === item.href ||
      (item.href !== "/" && pathname.startsWith(item.href)),
  );

  useEffect(() => {
    if (isCrmManagementActive) {
      setIsCrmManagementOpen(true);
    }

    if (isWebsiteManagementActive) {
      setIsWebsiteManagementOpen(true);
    }
  }, [isCrmManagementActive, isWebsiteManagementActive]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleConfirmLogout = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut({ redirect: false });
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setIsSigningOut(false);
      setIsLogoutOpen(false);
      setIsMobileMenuOpen(false);
      router.replace("/login");
    }
  };

  return (
    <>
      {!isMobileMenuOpen && (
        <button
          onClick={toggleMobileMenu}
          className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-lg bg-[#212121] text-white shadow-lg hover:bg-[#313131] transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      )}

      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "flex h-screen  sticky bottom-0 top-0 flex-col bg-white z-50 transition-transform duration-300 overflow-auto border-r border-slate-200",
          "fixed lg:static",
          "w-[240px] sm:w-[250px] lg:w-[300px]",
          isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Header with Logo */}
        <div className="flex flex-col items-center justify-center relative px-6 pt-6 pb-10">
          <div className="flex h-[100px] w-[220px] items-center justify-center">
            <Image
              src="/logo2.png"
              alt="Logo"
              width={1000}
              height={1000}
              className="object-contain w-full h-full"
            />
          </div>

          {/* Close Button - mobile only */}
          {isMobileMenuOpen && (
            <button
              onClick={toggleMobileMenu}
              className="lg:hidden absolute right-3 top-4 p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 hide-scrollbar flex flex-col gap-1 px-4 pb-6 overflow-y-auto">
          {topNavigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex w-full min-w-0 items-center justify-start gap-2 rounded-[4px] px-4 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-[#FBFF26] text-slate-900 shadow-[0_1px_0_rgba(0,0,0,0.04)]"
                    : "text-slate-800 hover:bg-slate-100",
                )}
              >
                <item.icon
                  className={cn(
                    "h-[28px] w-[18px] transition-colors duration-200 flex-shrink-0",
                    isActive ? "text-slate-900" : "text-slate-700",
                  )}
                />
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate font-medium text-[16px] leading-[120%] transition-colors duration-200",
                    isActive ? "text-slate-900" : "text-slate-800",
                  )}
                  title={item.name}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setIsCrmManagementOpen((prev) => !prev)}
            className={cn(
              "flex w-full min-w-0 items-center justify-start gap-2 rounded-[4px] px-4 py-2 text-sm font-medium transition-all duration-200",
              isCrmManagementActive
                ? "bg-[#FBFF26] text-slate-900 shadow-[0_1px_0_rgba(0,0,0,0.04)]"
                : "text-slate-800 hover:bg-slate-100",
            )}
          >
            <FileText
              className={cn(
                "h-[28px] w-[18px] transition-colors duration-200 flex-shrink-0",
                isCrmManagementActive ? "text-slate-900" : "text-slate-700",
              )}
            />
            <span
              className={cn(
                "min-w-0 flex-1 truncate font-medium text-[16px] leading-[120%] text-left transition-colors duration-200",
                isCrmManagementActive ? "text-slate-900" : "text-slate-800",
              )}
            >
              CRM System
            </span>
            {isCrmManagementOpen ? (
              <ChevronDown className="h-4 w-4 text-slate-700 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-700 flex-shrink-0" />
            )}
          </button>

          {isCrmManagementOpen && (
            <div className="ml-4 flex flex-col gap-1">
              {crmManagementItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex w-full min-w-0 items-center justify-start gap-2 rounded-[4px] px-4 py-2 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-[#FBFF26] text-slate-900 shadow-[0_1px_0_rgba(0,0,0,0.04)]"
                        : "text-slate-800 hover:bg-slate-100",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-[24px] w-[16px] transition-colors duration-200 flex-shrink-0",
                        isActive ? "text-slate-900" : "text-slate-700",
                      )}
                    />
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate font-medium text-[15px] leading-[120%] transition-colors duration-200",
                        isActive ? "text-slate-900" : "text-slate-800",
                      )}
                      title={item.name}
                    >
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsWebsiteManagementOpen((prev) => !prev)}
            className={cn(
              "flex w-full min-w-0 items-center justify-start gap-2 rounded-[4px] px-4 py-2 text-sm font-medium transition-all duration-200",
              isWebsiteManagementActive
                ? "bg-[#FBFF26] text-slate-900 shadow-[0_1px_0_rgba(0,0,0,0.04)]"
                : "text-slate-800 hover:bg-slate-100",
            )}
          >
            <Globe
              className={cn(
                "h-[28px] w-[18px] transition-colors duration-200 flex-shrink-0",
                isWebsiteManagementActive ? "text-slate-900" : "text-slate-700",
              )}
            />
            <span
              className={cn(
                "min-w-0 flex-1 truncate font-medium text-[16px] leading-[120%] text-left transition-colors duration-200",
                isWebsiteManagementActive ? "text-slate-900" : "text-slate-800",
              )}
            >
              Website Management
            </span>
            {isWebsiteManagementOpen ? (
              <ChevronDown className="h-4 w-4 text-slate-700 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-700 flex-shrink-0" />
            )}
          </button>

          {isWebsiteManagementOpen && (
            <div className="ml-4 flex flex-col gap-1">
              {websiteManagementItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex w-full min-w-0 items-center justify-start gap-2 rounded-[4px] px-4 py-2 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-[#FBFF26] text-slate-900 shadow-[0_1px_0_rgba(0,0,0,0.04)]"
                        : "text-slate-800 hover:bg-slate-100",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-[24px] w-[16px] transition-colors duration-200 flex-shrink-0",
                        isActive ? "text-slate-900" : "text-slate-700",
                      )}
                    />
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate font-medium text-[15px] leading-[120%] transition-colors duration-200",
                        isActive ? "text-slate-900" : "text-slate-800",
                      )}
                      title={item.name}
                    >
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex w-full min-w-0 items-center justify-start gap-2 rounded-[4px] px-4 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-[#FBFF26] text-slate-900 shadow-[0_1px_0_rgba(0,0,0,0.04)]"
                    : "text-slate-800 hover:bg-slate-100",
                )}
              >
                <item.icon
                  className={cn(
                    "h-[28px] w-[18px] transition-colors duration-200 flex-shrink-0",
                    isActive ? "text-slate-900" : "text-slate-700",
                  )}
                />
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate font-medium text-[16px] leading-[120%] transition-colors duration-200",
                    isActive ? "text-slate-900" : "text-slate-800",
                  )}
                  title={item.name}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-4 pb-6">
          <button
            type="button"
            onClick={() => setIsLogoutOpen(true)}
            className="w-full flex items-center justify-center gap-3 rounded-[6px] border border-red-500 px-4 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-50"
          >
            <span>
              <LogOut className="h-4 w-4" />
            </span>
            Log out
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {isLogoutOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsLogoutOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            className="relative w-full max-w-[420px] rounded-[12px] bg-white p-6 shadow-xl"
          >
            <h3
              id="logout-title"
              className="text-lg font-semibold text-slate-900"
            >
              Confirm Logout
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to sign out?
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsLogoutOpen(false)}
                className="rounded-[6px] border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                disabled={isSigningOut}
                className="rounded-[6px] bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSigningOut ? "Signing out..." : "Logout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
