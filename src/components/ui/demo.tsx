import { EfferdDashboard2 } from "@/components/ui/efferd-dashboard-2";
import { Component as SilkBackground } from "@/components/ui/silk-background-animation";
export default function Demo() {
  return (
    <>
      <SilkBackground />
      <div className="relative z-10">
        <EfferdDashboard2 />
      </div>
    </>
  );
}
