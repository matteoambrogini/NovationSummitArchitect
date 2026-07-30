import type { GenerationInsight } from "../ai/provider";
import { copy } from "../i18n/it";

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function AiGenerationSummary({ insight }: { insight: GenerationInsight }) {
  const sound = insight.soundAnalysis;
  return (
    <section className={`card ai-summary${insight.partial ? " partial" : ""}`}>
      <div className="ai-summary-copy">
        <span className="eyebrow accent">{copy.ai.summaryEyebrow}</span>
        <h2>{insight.summary}</h2>
        <div className="ai-summary-badges">
          <span>{insight.repaired ? copy.ai.repairApplied : copy.ai.directOutput}</span>
          <span>{insight.partial ? copy.ai.partialFallback : copy.ai.completeValidation}</span>
          {insight.metadata ? <span>{insight.metadata.model}</span> : null}
        </div>
        {sound ? (
          <dl className="ai-sound-metrics">
            <div>
              <dt>{copy.ai.brightness}</dt>
              <dd>{percent(sound.brightness)}</dd>
            </div>
            <div>
              <dt>{copy.ai.movement}</dt>
              <dd>{percent(sound.movement)}</dd>
            </div>
            <div>
              <dt>{copy.ai.width}</dt>
              <dd>{percent(sound.width)}</dd>
            </div>
          </dl>
        ) : null}
      </div>
      <div className="ai-summary-details">
        {insight.sectionConfidence.length ? (
          <div>
            <strong>{copy.ai.sectionConfidence}</strong>
            <div className="confidence-tags">
              {insight.sectionConfidence.map((section) => (
                <span key={section.section} title={section.reason}>
                  {section.section} · {percent(section.confidence)}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {insight.warnings.length || insight.assumptions.length ? (
          <div>
            <strong>{copy.ai.warnings}</strong>
            <ul>
              {[...insight.warnings, ...insight.assumptions].slice(0, 6).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {insight.metadata ? (
          <small>
            {insight.metadata.durationMilliseconds} ms
            {insight.metadata.usage ? ` · ${insight.metadata.usage.totalTokens} token` : ""}
          </small>
        ) : null}
      </div>
    </section>
  );
}
