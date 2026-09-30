import { RequireRole } from "@/components/require-role";
import { FieldCameraCapture } from "@/components/field-camera-capture";

export default function FieldCameraPage() {
  return (
    <RequireRole requirement="all">
      <main className="vektor-page" style={{ fontFamily: "ui-monospace, 'Courier New', monospace", color: "#e5e7eb" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <h1 style={{ fontSize: 16, marginBottom: 12, color: "#7dd3fc", letterSpacing: "0.06em" }}>Field Camera</h1>
          <FieldCameraCapture />
        </div>
      </main>
    </RequireRole>
  );
}
