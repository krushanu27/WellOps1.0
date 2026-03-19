import type {
    InsightItem,
    InsightSeverity,
    InsightsResponse,
} from "../dashboard.api";

type Props = {
    data?: InsightsResponse;
    isLoading?: boolean;
    isError?: boolean;
};

function severityClass(severity: InsightSeverity) {
    switch (severity) {
        case "critical":
            return "wo-insight wo-insight-high";
        case "high":
            return "wo-insight wo-insight-high";
        case "medium":
            return "wo-insight wo-insight-medium";
        case "low":
            return "wo-insight wo-insight-low";
        default:
            return "wo-insight wo-insight-low";
    }
}

function severityBadgeClass(severity: InsightSeverity) {
    const badgeSeverity =
        severity === "critical" ? "high" : severity === "info" ? "low" : severity;
    return `wo-badge wo-badge--${badgeSeverity}`;
}

function formatCategory(category: InsightItem["category"]) {
    return category.replace(/_/g, " ");
}

function formatMetricValue(value: number | string) {
    return typeof value === "number" ? value.toLocaleString() : value;
}

function formatChange(change: number) {
    const sign = change > 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}%`;
}

export function InsightsPanel({
    data,
    isLoading = false,
    isError = false,
}: Props) {
    const insights = data?.items ?? [];

    return (
        <section className="wo-panel" style={{ marginTop: 24 }}>
            <div className="wo-panel-header">
                <div>
                    <h3>AI Insights</h3>
                    <p className="wo-muted" style={{ margin: 0 }}>
                        Automated signals and recommended actions
                    </p>
                </div>

                {data && (
                    <div className="wo-muted" style={{ fontSize: 13 }}>
                        {data.scope === "org" ? "Org-wide" : "Team scope"} • {data.period_days}d
                    </div>
                )}
            </div>

            {isLoading ? (
                <div className="wo-empty-state">Loading insights...</div>
            ) : isError ? (
                <div className="wo-empty-state">Insights are not available yet.</div>
            ) : insights.length === 0 ? (
                <div className="wo-empty-state">No major insights detected.</div>
            ) : (
                <div className="wo-insights-grid">
                    {insights.map((insight) => (
                        <article key={insight.id} className={severityClass(insight.severity)}>
                            <div className="wo-insight-top">
                                <span className={severityBadgeClass(insight.severity)}>
                                    {insight.severity.toUpperCase()}
                                </span>
                                <span className="wo-insight-type">
                                    {formatCategory(insight.category).toUpperCase()}
                                </span>
                            </div>

                            <h4>{insight.title}</h4>
                            <p>{insight.summary}</p>

                            {insight.metrics.length > 0 && (
                                <div className="wo-insight-metrics">
                                    {insight.metrics.map((metric) => (
                                        <div
                                            key={`${insight.id}-${metric.label}`}
                                            className="wo-insight-metric"
                                        >
                                            <span>
                                                <strong>{metric.label}:</strong> {formatMetricValue(metric.value)}
                                            </span>

                                            {typeof metric.change_pct === "number" && (
                                                <span className="wo-muted" style={{ marginLeft: 8 }}>
                                                    ({formatChange(metric.change_pct)})
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="wo-insight-recommendation">
                                <strong>Recommendation:</strong> {insight.recommendation}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}