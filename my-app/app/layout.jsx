export const metadata = {
  title: "DUWIMS",
  description: "DUWIMS split pages",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
