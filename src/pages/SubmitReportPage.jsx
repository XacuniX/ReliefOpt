import { useState } from "react";
import ReportForm from "../components/reports/ReportForm";

export default function SubmitReportPage() {
  const [, setSubmitted] = useState(null);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Submit Report</h1>
        <p className="text-sm text-muted-foreground mt-1">
          File a new emergency report for response coordination.
        </p>
      </div>
      <ReportForm onSubmit={setSubmitted} />
    </div>
  );
}
