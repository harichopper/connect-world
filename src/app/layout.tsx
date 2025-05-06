
import type {Metadata} from 'next';
// import { GeistSans } from 'geist/font/sans'; // Removed due to build error
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

// const geistSans = GeistSans; // Removed

export const metadata: Metadata = {
  title: 'ChatterBox',
  description: 'Real-time chat application',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
       {/* Removed geistSans.className */}
      <body className={`antialiased`}>
        <main>{children}</main>
        <Toaster /> {/* Add Toaster component */}
      </body>
    </html>
  );
}

