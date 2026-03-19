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

const COLORS = ["#4f46e5", "#7c3aed", "#94a3b8", "#22c55e", "#f59e0b"];

export function RoleDistributionChart({ data }: Props) {
    const chartData = Object.entries(data).map(([name, value]) => ({
        name,
        value,
    }));

    return (
        <div className="wo-chart-card">
            <div className="wo-chart-card__header">
                <h3>User Role Distribution</h3>
                <p className="wo-muted">Breakdown of users by system role</p>
            </div>

            {chartData.length === 0 ? (
                <div className="wo-chart-empty">No role data available.</div>
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
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={entry.name}
                                        fill={COLORS[index % COLORS.length]}
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