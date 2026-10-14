import { ArrowRight, Briefcase, CheckCircle, FileText, GitMerge, ListChecks, Users } from "../design-system/icons";
import { PageHeader } from "../components/ui/PageHeader";
import { useI18n } from "../i18n";

const stepIcons = [Users, Briefcase, GitMerge, ListChecks, CheckCircle];

function DetailFlow({ items }: { items: string[] }) {
  return <div className="flex flex-wrap items-center gap-2">{items.map((item, index) => <span key={`${item}-${index}`} className="flex items-center gap-2"><span className="rounded border border-app-border bg-app-raised px-2.5 py-1 text-[10px] text-app-secondary">{item}</span>{index < items.length - 1 && <ArrowRight size={12} className="text-app-brand/70" />}</span>)}</div>;
}

function DetailSection({ number, icon: Icon, title, body, technical, flow, example, callout, list, formula }: { number: string; icon: React.ElementType; title: string; body: string; technical: string; flow: string[]; example?: string; callout?: string; list?: string[]; formula?: React.ReactNode }) {
  const { t } = useI18n();
  return <section className="grid gap-4 border-t border-app-border pt-6 lg:grid-cols-[180px_minmax(0,1fr)]">
    <div className="flex items-start gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-app-brand-subtle text-app-brand"><Icon size={15} /></div><div><span className="font-mono text-[10px] text-app-faint">{number}</span><h3 className="mt-1 text-sm font-semibold text-app-primary">{title}</h3></div></div>
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(240px,0.85fr)]">
      <div className="space-y-3"><p className="text-xs leading-5 text-app-secondary">{body}</p><div><p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-app-faint">{t("how_detail_technical")}</p><p className="text-xs leading-5 text-app-muted">{technical}</p></div>{list && <ul className="space-y-1 text-xs text-app-secondary">{list.map(item => <li key={item} className="flex gap-2"><span className="text-app-brand">•</span>{item}</li>)}</ul>}{example && <div className="rounded-lg border border-app-border bg-app-raised px-3 py-2.5"><p className="text-[10px] font-medium uppercase tracking-wider text-app-faint">{t("how_detail_example")}</p><p className="mt-1 font-mono text-[11px] text-app-brand">{example}</p></div>}{callout && <div className="rounded-lg border border-app-brand/30 bg-app-brand-subtle/30 px-3 py-2.5 text-xs leading-5 text-app-secondary">{callout}</div>}{formula}</div>
      <div className="self-start rounded-lg border border-app-border bg-app-surface p-3"><p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-app-faint">{t("how_detail_flow")}</p><DetailFlow items={flow} /></div>
    </div>
  </section>;
}

export default function HowItWorks() {
  const { t } = useI18n();
  const steps = [
    ["how_simple_consultant", t("how_simple_consultant")],
    ["how_simple_assignment", t("how_simple_assignment")],
    ["how_simple_matching", t("how_simple_matching")],
    ["how_simple_score", t("how_simple_score")],
    ["how_simple_review", t("how_simple_review")],
  ] as const;

  return <div className="h-full overflow-auto">
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <PageHeader title={t("how_title")} description={t("how_simple_description")} />

      <section aria-label={t("how_flow_label")} className="flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-0">
        {steps.map(([key, title], index) => {
          const Icon = stepIcons[index];
          return <div key={key} className="flex min-w-0 flex-1 flex-col lg:flex-row lg:items-center">
            <div className="flex min-h-[112px] flex-1 flex-col rounded-lg border border-app-border bg-app-surface p-3.5 shadow-app-surface">
              <div className="flex items-start justify-between gap-2"><div className="flex h-7 w-7 items-center justify-center rounded-md bg-app-brand-subtle text-app-brand"><Icon size={14} /></div><span className="font-mono text-[10px] text-app-faint">0{index + 1}</span></div>
              <h2 className="mt-3 text-xs font-semibold leading-4 text-app-primary">{title}</h2>
              <p className="mt-1 text-[11px] leading-4 text-app-muted">{t(`${key}_description` as Parameters<typeof t>[0])}</p>
            </div>
            {index < steps.length - 1 && <div className="flex h-7 items-center justify-center text-app-brand/70 lg:w-9"><ArrowRight className="hidden lg:block" size={16} /><span className="text-lg lg:hidden">↓</span></div>}
          </div>;
        })}
      </section>

      <section className="border-t border-app-border pt-6"><h2 className="text-base font-semibold text-app-primary">{t("how_detail_title")}</h2><p className="mt-1 text-xs text-app-muted">{t("how_detail_intro")}</p></section>
      <div className="space-y-6">
        <DetailSection number="01" icon={Users} title={t("how_simple_consultant")} body={t("how_detail_consultant_body")} technical={t("how_detail_consultant_technical")} example="React.js → React → SkillId" flow={[t("how_flow_cv"), t("how_flow_extraction"), t("how_flow_normalization"), t("how_flow_catalog"), t("how_flow_profile")]} />
        <DetailSection number="02" icon={Briefcase} title={t("how_simple_assignment")} body={t("how_detail_assignment_body")} technical={t("how_detail_assignment_technical")} flow={[t("how_flow_assignment"), t("how_flow_requirements"), t("how_flow_normalization"), t("how_flow_catalog"), t("how_flow_structured_requirements")]} />
        <DetailSection number="03" icon={GitMerge} title={t("how_simple_matching")} body={t("how_detail_matching_body")} technical={t("how_detail_matching_technical")} list={[t("how_detail_matched"), t("how_detail_missing"), t("how_detail_relevant")]} flow={[t("how_flow_assignment_requirements"), t("how_flow_consultant_profile"), t("how_flow_matching_service"), t("how_flow_matching_result")]} />
        <DetailSection number="04" icon={ListChecks} title={t("how_simple_score")} body={t("how_detail_score_body")} technical={t("how_detail_score_technical")} callout={t("how_detail_score_callout")} flow={[t("how_flow_matching_result"), t("how_flow_rules"), t("how_flow_match_score")]} formula={<div className="rounded-lg border border-app-border bg-app-raised px-3 py-2.5"><p className="text-[10px] font-medium uppercase tracking-wider text-app-faint">{t("how_score_formula_title")}</p><p className="mt-2 border-b border-app-border pb-2.5 font-mono text-[13px] font-semibold leading-5 text-app-primary">{t("how_score_formula")}</p><div className="pt-2"><p className="text-[10px] leading-4 text-app-muted">{t("how_score_formula_weights")}</p><p className="mt-1 text-[10px] leading-4 text-app-muted">{t("how_score_formula_rules")}</p></div></div>} />
        <section className="grid gap-4 border-t border-app-border pt-6 lg:grid-cols-[180px_minmax(0,1fr)]">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-app-brand-subtle text-app-brand"><GitMerge size={15} /></div>
            <div><span className="font-mono text-[10px] text-app-faint">04A · OPTIONAL</span><h3 className="mt-1 text-sm font-semibold text-app-primary">{t("how_ai_title")}</h3></div>
          </div>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(240px,0.85fr)]">
            <div className="space-y-3">
              <p className="text-xs leading-5 text-app-secondary">{t("how_ai_body")}</p>
              <div><p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-app-faint">{t("how_detail_technical")}</p><p className="text-xs leading-5 text-app-muted">{t("how_ai_technical")}</p></div>
              <div className="rounded-lg border border-app-brand/30 bg-app-brand-subtle/30 px-3 py-2.5 text-xs leading-5 text-app-secondary">{t("how_ai_note")}</div>
            </div>
            <div className="self-start rounded-lg border border-app-border bg-app-surface p-3">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-app-faint">{t("how_detail_flow")}</p>
              <DetailFlow items={[t("how_flow_match_score"), t("how_ai_flow_cv"), t("how_ai_flow_compare"), t("how_ai_flow_result")]} />
            </div>
          </div>
        </section>
        <DetailSection number="05" icon={CheckCircle} title={t("how_simple_review")} body={t("how_detail_review_body")} technical={t("how_detail_review_technical")} list={[t("how_detail_score_label"), t("how_detail_matched"), t("how_detail_missing"), t("how_detail_relevant"), t("how_detail_strengths")]} flow={[t("how_flow_match_score"), t("how_flow_ranking"), t("how_flow_explanation"), t("how_flow_user_review")]} />
      </div>
      <section className="grid gap-4 border-t border-app-border pt-6 lg:grid-cols-[180px_minmax(0,1fr)]">
        <div className="flex items-start gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-app-brand-subtle text-app-brand"><FileText size={15} /></div><h3 className="text-sm font-semibold text-app-primary">{t("how_extra_title")}</h3></div>
        <div className="space-y-3">
          <p className="text-xs leading-5 text-app-secondary">{t("how_extra_cv")}</p>
          <p className="text-xs leading-5 text-app-secondary">{t("how_extra_limits")}</p>
          <p className="text-xs leading-5 text-app-secondary">{t("how_extra_freshness")}</p>
        </div>
      </section>
      <section className="flex items-start gap-3 rounded-lg border border-app-border bg-app-raised px-4 py-3"><FileText size={15} className="mt-0.5 shrink-0 text-app-brand" /><p className="text-xs leading-5 text-app-secondary">{t("how_detail_decision")}</p></section>
    </div>
  </div>;
}
