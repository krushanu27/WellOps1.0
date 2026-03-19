import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts"

const COLORS = {
    HIGH: "#ef4444",
    MEDIUM: "#f59e0b",
    LOW: "#22c55e",
}

type Props = {
    data: Record<string, number>
}

export function RiskDistributionChart({ data }: Props) {
    const chartData = Object.entries(data).map(([name, value]) => ({
        name,
        value,
    }))

    return (
        <div className="wo-chart-card">
            <div className="wo-chart-card__header">
                <div>
                    <h3>Latest Risk Distribution</h3>
                    <p className="wo-muted">Burnout prediction levels</p>
                </div>
            </div>

            <div className="wo-chart-wrap">
                <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                        <Pie
                            data={chartData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={60}
                            outerRadius={90}
                        >
                            {chartData.map((entry) => (
                                <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS]} />
                            ))}
                        </Pie>

                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}