import { Footer, Layout, Navbar } from "nextra-theme-docs";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import "nextra-theme-docs/style.css";
import { Analytics } from "@vercel/analytics/react";

export const metadata = {
  // Define your metadata here
  // For more information on metadata API, see: https://nextjs.org/docs/app/building-your-application/optimizing/metadata
};

const navbar = (
  <Navbar
    logo={<b>OpenKit</b>}
    projectLink="https://github.com/synaptic-dev/openkit"
    // ... Your additional navbar options
  />
);
const footer = <Footer>{new Date().getFullYear()} © OpenKit.</Footer>;

export default async function RootLayout({ children }) {
  return (
    <html
      // Not required, but good for SEO
      lang="en"
      // Required to be set
      dir="ltr"
      // Suggested by `next-themes` package https://github.com/pacocoursey/next-themes#with-app
      suppressHydrationWarning
    >
      <Head
      // ... Your additional head options
      >
        {/* Your additional tags should be passed as `children` of `<Head>` element */}
      </Head>
      <Analytics />
      <body>
        <Layout
          navbar={navbar}
          pageMap={await getPageMap()}
          footer={footer}
          darkMode={false}
          editLink={null}
          feedback={{ content: null }}
          sidebar={{
            toggleButton: false,
          }}
          nextThemes={{
            defaultTheme: "light",
          }}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
