/**
 * Layout shell: header · (params | visualization | stats) · charts · AI summary.
 * All feature components are store-connected and take no props — the stores
 * are the contract.
 */
import { Header } from './components/layout/Header';
import { ParamGroup } from './components/params/ParamGroup';
import { FullCarDiagram } from './components/viz/FullCarDiagram';
import { QuarterCarDiagram } from './components/viz/QuarterCarDiagram';
import { RoadInputControls } from './components/viz/RoadInputControls';
import { StatGrid } from './components/stats/StatGrid';
import { StepResponseChart } from './components/charts/StepResponseChart';
import { TransmissibilityChart } from './components/charts/TransmissibilityChart';
import { LoadTransferBar } from './components/charts/LoadTransferBar';
import { CompareBar } from './components/compare/CompareBar';
import { SummaryPanel } from './components/ai/SummaryPanel';
import { PromptInspector } from './components/ai/PromptInspector';
import { LessonDrawer } from './components/lessons/LessonDrawer';
import { ToastHost, toast } from './components/common/Toast';
import { Panel } from './components/layout/Panel';
import { CATEGORY_ORDER } from './data/parameterMeta';
import { useDebouncedSummary } from './hooks/useDebouncedSummary';
import { useConfigStore } from './store/useConfigStore';
import { shouldWarnStorage } from './store/storage';
import { useEffect } from 'react';

export default function App() {
  useDebouncedSummary();
  const snapshotA = useConfigStore((s) => s.snapshotA);

  useEffect(() => {
    if (shouldWarnStorage()) {
      toast('Browser storage unavailable — settings will not persist this session.', {
        tone: 'warn',
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-base pb-8">
      <Header />
      {snapshotA && <CompareBar />}

      <main className="mx-auto grid max-w-[1720px] grid-cols-1 gap-4 px-4 pt-4 lg:grid-cols-[320px_minmax(0,1fr)_360px] xl:grid-cols-[340px_minmax(0,1fr)_400px]">
        {/* ── Left: parameters ── */}
        <div className="order-2 flex flex-col gap-3 lg:order-1">
          {CATEGORY_ORDER.map((cat) => (
            <ParamGroup key={cat} category={cat} />
          ))}
        </div>

        {/* ── Center: visualization ── */}
        <div className="order-1 flex flex-col gap-4 lg:order-2">
          {/* Sticky mini-view on mobile so the car stays visible while scrolling params */}
          <div className="sticky top-2 z-30 lg:static lg:z-auto">
            <Panel title="Vehicle" flush className="overflow-hidden">
              <FullCarDiagram />
            </Panel>
          </div>
          <Panel title="Quarter-Car Model" flush className="overflow-hidden">
            <QuarterCarDiagram />
            <RoadInputControls />
          </Panel>
        </div>

        {/* ── Right: stats ── */}
        <div className="order-3">
          <StatGrid />
        </div>
      </main>

      {/* ── Charts row ── */}
      <div className="mx-auto mt-4 grid max-w-[1720px] grid-cols-1 gap-4 px-4 md:grid-cols-2 xl:grid-cols-3">
        <Panel title="Step Response" flush className="overflow-hidden">
          <StepResponseChart />
        </Panel>
        <Panel title="Transmissibility" flush className="overflow-hidden">
          <TransmissibilityChart />
        </Panel>
        <Panel title="Corner Loads" flush className="overflow-hidden md:col-span-2 xl:col-span-1">
          <LoadTransferBar />
        </Panel>
      </div>

      {/* ── AI summary ── */}
      <div className="mx-auto mt-4 max-w-[1720px] px-4">
        <SummaryPanel />
      </div>

      <LessonDrawer />
      <PromptInspector />
      <ToastHost />
    </div>
  );
}
