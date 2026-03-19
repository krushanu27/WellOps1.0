import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts"

type Props = {
    data: { date: string; count: number }[]
}

export function PredictionTrendChart({ data }: Props) {
    return (
        <div className="wo-chart-card">
            <div className="wo-chart-card__header">
                <div>
                    <h3>Prediction Activity</h3>
                    <p className="wo-muted">Last 7 days</p>
                </div>
            </div>

            <div className="wo-chart-wrap">
                <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Line
                            type="monotone"
                            dataKey="count"
                            stroke="#6366f1"
                            strokeWidth={3}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}