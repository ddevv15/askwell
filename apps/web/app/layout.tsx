import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { APP_NAME } from "@askwell/shared";
import {
  AFTER_AUTH_URL,
  AFTER_SIGN_OUT_URL,
  SIGN_IN_URL,
  SIGN_UP_URL,
} from "@/lib/auth/routes";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: `${APP_NAME}: an AI support chat widget for any website.`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ClerkProvider
          signInUrl={SIGN_IN_URL}
          signUpUrl={SIGN_UP_URL}
          signInFallbackRedirectUrl={AFTER_AUTH_URL}
          signUpFallbackRedirectUrl={AFTER_AUTH_URL}
          afterSignOutUrl={AFTER_SIGN_OUT_URL}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
