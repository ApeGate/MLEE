"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronRight,
  CircleDot,
  FlaskConical,
  LockKeyhole,
  Pause,
  Save,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  createPlanSpec,
  rehearsePlan,
  validatePlanDraft,
  type ExitTemplate,
  type PlanDraft,
  type PlanRehearsal,
  type PlanSpec,
  type PlanTemplate,
  type Profile,
} from "../../../packages/core/src";
import { cn } from "@/lib/utils";
import { useLaunchFeed } from "@/lib/use-launch-feed";
import { useReceipts } from "@/lib/use-receipts";

const TEMPLATES: Array<{
  id: PlanTemplate;
  name: string;
  lane: string;
  entry: string;
  exit: ExitTemplate;
}> = [
  {
    id: "first-minutes",
    name: "First Minutes",
    lane: "Age 30s–10m · early curve",
    entry: "Net inflow and holder growth after a Strict Gate",
    exit: "quick-flip",
  },
  {
    id: "curve-climber",
    name: "Curve Climber",
    lane: "Mid-curve momentum",
    entry: "Curve progress plus buyer strength",
    exit: "let-it-run",
  },
  {
    id: "graduation-watch",
    name: "Graduation Watch",
    lane: "Migration and opening pool",
    entry: "Wait for the pool to hold before entry",
    exit: "bail-fast",
  },
  {
    id: "survivor-dip",
    name: "Survivor Dip",
    lane: "Graduated over 60m",
    entry: "Dip then reclaim of short VWAP",
    exit: "let-it-run",
  },
  {
    id: "dev-watch",
    name: "Dev Watch",
    lane: "Watched creator launches",
    entry: "Kong PASS plus your explicit size",
    exit: "quick-flip",
  },
];

const DEFAULT_DRAFT: PlanDraft = {
  name: "First ten minutes",
  template: "first-minutes",
  profile: "strict",
  sizeSol: 0.1,
  perTradeCapSol: 0.25,
  dailySpendCapSol: 1,
  slippageBps: 800,
  exitTemplate: "quick-flip",
  approvalRequired: true,
  coolOffAfterLosses: 3,
  coolOffMinutes: 15,
};

export function PlanBuilder() {
  const { launches, status } = useLaunchFeed();
  const { addPlanChange } = useReceipts();
  const [draft, setDraft] = useState<PlanDraft>(DEFAULT_DRAFT);
  const [spec, setSpec] = useState<PlanSpec | null>(null);
  const [rehearsal, setRehearsal] = useState<PlanRehearsal | null>(null);
  const [running, setRunning] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validation = useMemo(() => validatePlanDraft(draft), [draft]);
  const replaySamples = launches
    .filter((launch) => launch.source === "replay")
    .map((launch) => ({ facts: launch.facts, verdict: launch.verdict }));

  function update<K extends keyof PlanDraft>(key: K, value: PlanDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setSpec(null);
    setRehearsal(null);
    setSaved(false);
    setError(null);
  }

  function chooseTemplate(template: (typeof TEMPLATES)[number]) {
    setDraft((current) => ({
      ...current,
      template: template.id,
      exitTemplate: template.exit,
      name: template.name,
    }));
    setSpec(null);
    setRehearsal(null);
    setSaved(false);
  }

  async function runRehearsal() {
    setRunning(true);
    setError(null);
    try {
      const nextSpec = createPlanSpec(draft, Date.now());
      const result = await rehearsePlan(nextSpec, replaySamples);
      setSpec(nextSpec);
      setRehearsal(result);
      setSaved(false);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Rehearsal failed",
      );
    } finally {
      setRunning(false);
    }
  }

  async function savePlan() {
    if (!spec || !rehearsal) return;
    const savedPlans = JSON.parse(
      window.localStorage.getItem("apegate.plans.v1") ?? "[]",
    ) as unknown[];
    window.localStorage.setItem(
      "apegate.plans.v1",
      JSON.stringify(
        [...savedPlans, { spec, rehearsal }].slice(-20),
      ),
    );
    await addPlanChange(
      rehearsal.planHash,
      spec.name,
      rehearsal.tapeFactsHash,
    );
    setSaved(true);
  }

  return (
    <div className="min-h-[100svh] bg-[#080705] text-[#f4efe5]">
      <header className="sticky top-0 z-40 border-b border-[#31291f] bg-[#080705]/90 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="flex shrink-0 items-center gap-2.5">
              <Image
                src="/apegate-logo.jpg"
                alt=""
                width={38}
                height={38}
                priority
                className="size-9 rounded-xl border border-[#ff4f1f]/35 object-cover"
              />
              <span className="hidden text-sm font-extrabold sm:block">
                APEGATE
              </span>
            </Link>
            <span className="h-5 w-px bg-[#31291f]" />
            <div>
              <p className="text-xs font-bold">Caesar&apos;s plan builder</p>
              <p className="font-mono text-[7px] uppercase tracking-[0.14em] text-[#6f685f]">
                Draft · validate · rehearse
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[#c7ff45]/25 bg-[#c7ff45]/7 px-2.5 py-1 font-mono text-[7px] font-bold uppercase text-[#c7ff45]">
              LOCAL ONLY
            </span>
            <Link
              href="/paper"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#31291f] px-3 py-2 text-xs font-bold hover:border-[#c7ff45]/50"
            >
              <ArrowLeft className="size-3" />
              Paper desk
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
          <aside>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#c7ff45]">
              Limits before logic
            </p>
            <h1 className="mt-3 text-5xl font-extrabold leading-[0.92] tracking-[-0.065em] sm:text-6xl">
              Rehearse.
              <br />
              <span className="text-stroke">Then lock.</span>
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-[#91897e]">
              Choose a lifecycle template, tighten the caps, and run it over
              the recorded Gate tape. Saving locks an immutable local version;
              no runner, approval, or transaction is activated.
            </p>

            <div className="mt-7 space-y-2">
              <Boundary
                icon={<ShieldCheck className="size-4" />}
                title="Gate stays upstream"
                copy="Hard checks are identical in every profile."
                color="text-[#ff7250]"
              />
              <Boundary
                icon={<Pause className="size-4" />}
                title="Cool-off included"
                copy="Draft pauses entries after the configured loss count."
                color="text-[#5cc8ff]"
              />
              <Boundary
                icon={<LockKeyhole className="size-4" />}
                title="Execution disabled"
                copy="PlanRunner and Privy signing remain locked."
                color="text-[#c7ff45]"
              />
            </div>

            <Link
              href="/vault"
              className="mt-5 flex items-center justify-between rounded-xl border border-[#5cc8ff]/25 bg-[#5cc8ff]/5 p-4 text-xs font-bold text-[#86d8ff]"
            >
              Preview Privy Vault policy
              <ChevronRight className="size-4" />
            </Link>
          </aside>

          <section className="overflow-hidden rounded-[1.6rem] border border-[#3a3328] bg-[#0d0b09]">
            <div className="border-b border-[#31291f] p-5 sm:p-6">
              <p className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-[#c7ff45]">
                01 · Lifecycle template
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => chooseTemplate(template)}
                    className={cn(
                      "rounded-xl border p-3 text-left",
                      draft.template === template.id
                        ? "border-[#c7ff45]/40 bg-[#c7ff45]/7"
                        : "border-[#31291f] bg-[#090806] hover:border-[#4b4134]",
                    )}
                  >
                    <p className="text-xs font-extrabold">{template.name}</p>
                    <p className="mt-1 text-[8px] text-[#6f685f]">
                      {template.lane}
                    </p>
                    <p className="mt-2 text-[9px] leading-relaxed text-[#91897e]">
                      {template.entry}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid border-b border-[#31291f] md:grid-cols-2">
              <div className="space-y-4 border-b border-[#31291f] p-5 md:border-b-0 md:border-r sm:p-6">
                <p className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-[#c7ff45]">
                  02 · Size & Gate
                </p>
                <PlanField label="Plan name">
                  <input
                    value={draft.name}
                    onChange={(event) => update("name", event.target.value)}
                    className="launch-input"
                    maxLength={48}
                  />
                </PlanField>
                <PlanField label="Kong profile">
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["strict", "standard", "loose"] as Profile[]).map(
                      (profile) => (
                        <button
                          key={profile}
                          type="button"
                          onClick={() => update("profile", profile)}
                          className={cn(
                            "rounded-lg border px-2 py-2 font-mono text-[8px] font-bold uppercase",
                            draft.profile === profile
                              ? "border-[#ff7250]/40 bg-[#ff4f1f]/8 text-[#ff8a64]"
                              : "border-[#31291f] text-[#6f685f]",
                          )}
                        >
                          {profile}
                        </button>
                      ),
                    )}
                  </div>
                </PlanField>
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="Order SOL"
                    value={draft.sizeSol}
                    step={0.05}
                    onChange={(value) => update("sizeSol", value)}
                  />
                  <NumberField
                    label="Per-trade cap"
                    value={draft.perTradeCapSol}
                    step={0.05}
                    onChange={(value) => update("perTradeCapSol", value)}
                  />
                  <NumberField
                    label="Daily cap"
                    value={draft.dailySpendCapSol}
                    step={0.25}
                    onChange={(value) => update("dailySpendCapSol", value)}
                  />
                  <NumberField
                    label="Slippage %"
                    value={draft.slippageBps / 100}
                    step={1}
                    max={25}
                    onChange={(value) =>
                      update("slippageBps", value * 100)
                    }
                  />
                </div>
              </div>

              <div className="space-y-4 p-5 sm:p-6">
                <p className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-[#5cc8ff]">
                  03 · Exits & cool-off
                </p>
                <PlanField label="Exit template">
                  <select
                    value={draft.exitTemplate}
                    onChange={(event) =>
                      update(
                        "exitTemplate",
                        event.target.value as ExitTemplate,
                      )
                    }
                    className="launch-input"
                  >
                    <option value="quick-flip">Quick flip</option>
                    <option value="let-it-run">Let it run</option>
                    <option value="bail-fast">Bail fast</option>
                  </select>
                </PlanField>
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="Pause after losses"
                    value={draft.coolOffAfterLosses}
                    step={1}
                    max={10}
                    onChange={(value) =>
                      update("coolOffAfterLosses", value)
                    }
                  />
                  <NumberField
                    label="Pause minutes"
                    value={draft.coolOffMinutes}
                    step={5}
                    max={1_440}
                    onChange={(value) => update("coolOffMinutes", value)}
                  />
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#5cc8ff]/25 bg-[#5cc8ff]/5 p-3">
                  <input
                    type="checkbox"
                    checked={draft.approvalRequired}
                    onChange={(event) =>
                      update("approvalRequired", event.target.checked)
                    }
                    className="mt-0.5 size-4 accent-[#5cc8ff]"
                  />
                  <span>
                    <span className="block text-[10px] font-bold">
                      Require manual approval
                    </span>
                    <span className="mt-1 block text-[8px] leading-relaxed text-[#6f85a5]">
                      Draft default. No plan can execute in this release.
                    </span>
                  </span>
                </label>

                <div className="rounded-xl border border-[#272119] bg-[#090806] p-3">
                  <p className="text-[9px] font-bold text-[#b6aea1]">
                    What Caesar would do
                  </p>
                  <p className="mt-2 text-[9px] leading-relaxed text-[#6f685f]">
                    Watch {templateName(draft.template)} with Kong&apos;s{" "}
                    {draft.profile} profile, prepare {draft.sizeSol} SOL entries
                    below a {draft.perTradeCapSol} SOL cap, use{" "}
                    {draft.exitTemplate.replaceAll("-", " ")} exits, and pause
                    after {draft.coolOffAfterLosses} losses.
                  </p>
                </div>
              </div>
            </div>

            <RehearsalPanel
              validation={validation}
              rehearsal={rehearsal}
              sampleCount={replaySamples.length}
              sourceStatus={status}
              running={running}
              saved={saved}
              error={error}
              onRun={() => void runRehearsal()}
              onSave={() => void savePlan()}
            />
          </section>
        </div>
      </main>
    </div>
  );
}

function RehearsalPanel({
  validation,
  rehearsal,
  sampleCount,
  sourceStatus,
  running,
  saved,
  error,
  onRun,
  onSave,
}: {
  validation: ReturnType<typeof validatePlanDraft>;
  rehearsal: PlanRehearsal | null;
  sampleCount: number;
  sourceStatus: string;
  running: boolean;
  saved: boolean;
  error: string | null;
  onRun: () => void;
  onSave: () => void;
}) {
  return (
    <div className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-[#ff7ad9]">
            04 · Zira rehearsal
          </p>
          <h2 className="mt-1 text-xl font-extrabold">
            Recorded-tape eligibility.
          </h2>
          <p className="mt-1 text-[9px] text-[#6f685f]">
            {sampleCount} REPLAY launches loaded · live source is {sourceStatus}
          </p>
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={!validation.valid || running || sampleCount === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-[#ff7ad9] px-4 py-2.5 text-xs font-extrabold text-[#090806] disabled:cursor-not-allowed disabled:bg-[#242019] disabled:text-[#5f584f]"
        >
          <FlaskConical className="size-3.5" />
          {running ? "Replaying…" : "Rehearse recorded tape"}
        </button>
      </div>

      {!validation.valid ? (
        <div className="mt-4 rounded-xl border border-block/20 bg-block/6 p-3">
          {validation.errors.map((item) => (
            <p key={item} className="text-[9px] text-block">
              · {item}
            </p>
          ))}
        </div>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-xl border border-block/20 bg-block/6 p-3 text-[9px] text-block">
          {error}
        </p>
      ) : null}

      {rehearsal ? (
        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_0.86fr]">
          <div className="grid grid-cols-3 gap-2">
            <RehearsalMetric
              label="Eligible"
              value={String(rehearsal.gateEligible)}
              color="text-pass"
            />
            <RehearsalMetric
              label="Blocked"
              value={String(rehearsal.blocked)}
              color="text-block"
            />
            <RehearsalMetric
              label="Waiting"
              value={String(rehearsal.waiting)}
              color="text-wait"
            />
          </div>
          <div className="rounded-xl border border-[#ffb13c]/20 bg-[#ffb13c]/5 p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-3.5 text-[#ffb13c]" />
              <p className="text-[9px] font-bold text-[#d7b477]">
                Eligibility only
              </p>
            </div>
            <p className="mt-1 text-[8px] leading-relaxed text-[#8f7651]">
              No P&L is produced. Recorded creates do not include the reserve,
              outcome, or landing data required for an honest performance replay.
            </p>
          </div>
          <div className="md:col-span-2">
            <div className="rounded-xl border border-[#272119] bg-[#090806] p-3">
              <p className="font-mono text-[7px] uppercase text-[#4f4941]">
                Immutable plan hash
              </p>
              <p className="mt-1 break-all font-mono text-[8px] text-[#91897e]">
                {rehearsal.planHash}
              </p>
            </div>
            <button
              type="button"
              onClick={onSave}
              disabled={saved}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#c7ff45]/30 bg-[#c7ff45]/7 px-4 py-3 text-xs font-bold text-[#c7ff45] disabled:opacity-60"
            >
              {saved ? (
                <>
                  <Check className="size-3.5" /> Saved with receipt
                </>
              ) : (
                <>
                  <Save className="size-3.5" /> Save inactive plan
                </>
              )}
            </button>
            <p className="mt-2 text-center font-mono text-[7px] uppercase tracking-[0.12em] text-[#4f4941]">
              PlanRunner disabled · approvals disabled · no execution
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex min-h-28 items-center justify-center rounded-xl border border-dashed border-[#31291f]">
          <p className="flex items-center gap-2 text-[9px] text-[#5f584f]">
            <CircleDot className="size-3" />
            Rehearsal is required before the local version can be saved.
          </p>
        </div>
      )}
    </div>
  );
}

function PlanField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[9px] font-bold text-[#91897e]">{label}</span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function NumberField({
  label,
  value,
  step,
  max,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <PlanField label={label}>
      <input
        type="number"
        min={step}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="launch-input font-mono"
      />
    </PlanField>
  );
}

function Boundary({
  icon,
  title,
  copy,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
  color: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#302a20] bg-[#0d0b09] p-3">
      <span className={`mt-0.5 ${color}`}>{icon}</span>
      <div>
        <p className="text-[10px] font-bold">{title}</p>
        <p className="mt-1 text-[8px] leading-relaxed text-[#6f685f]">{copy}</p>
      </div>
    </div>
  );
}

function RehearsalMetric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-[#272119] bg-[#090806] p-3">
      <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
      <p className="mt-1 text-[8px] text-[#5f584f]">{label}</p>
    </div>
  );
}

function templateName(value: PlanTemplate) {
  return TEMPLATES.find((template) => template.id === value)?.name ?? value;
}
