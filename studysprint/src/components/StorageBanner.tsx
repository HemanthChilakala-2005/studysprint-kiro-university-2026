// src/components/StorageBanner.tsx
// Persistent banner when localStorage is unavailable. [Req 6.5]

interface Props { visible: boolean; warnings: string[]; }

export function StorageBanner({ visible, warnings }: Props) {
  return (
    <>
      {visible && (
        <div className="banner banner-warning" role="alert" aria-live="assertive">
          ⚠ Storage unavailable — data will not be saved after you close this tab.
        </div>
      )}
      {warnings.map((w, i) => (
        <div key={i} className="banner banner-warning" role="status" aria-live="polite">
          ⚠ {w}
        </div>
      ))}
    </>
  );
}