import { LanguageProvider } from "./components/language-context";

export const metadata = {
  title: "DUWIMS",
  description: "DUWIMS split pages",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body style={{ margin: 0 }}>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}