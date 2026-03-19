import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

type Props = {
    data: Record<string, number>;
};

const STATUS_COLORS: Record<string, string> = {
    DRAFT: "#94a3b8",
    ACTIVE: "#22c55e",
    PUBLISHED: "#06b6d4",
    CLOSED: "#f59e0b",
    ARCHIVED: "#64748b",
};

export function SurveyStatusChart({ data }: Props) {
    const chartData = Object.entries(data).map(([name, value]) => ({
        name,
        value,
    }));

    return (
        <div className="wo-chart-card">
            <div className="wo-chart-card__header">
                <h3>Survey Status Mix</h3>
                <p className="wo-muted">Current survey lifecycle distribution</p>
            </div>

            {chartData.length === 0 ? (
                <div className="wo-chart-empty">No survey status data available.</div>
            ) : (
                <div className="wo-chart-wrap">
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie
                                data={chartData}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={70}
                                outerRadius={100}
                                paddingAngle={3}
                            >
                                {chartData.map((entry) => (
                                    <Cell
                                        key={entry.name}
                                        fill={STATUS_COLORS[entry.name] ?? "#7c3aed"}
                                    />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}