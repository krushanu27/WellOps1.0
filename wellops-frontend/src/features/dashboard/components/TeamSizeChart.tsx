import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

type Props = {
    data: { name: string; size: number }[];
};

export function TeamSizeChart({ data }: Props) {
    return (
        <div className="wo-chart-card">
            <div className="wo-chart-card__header">
                <h3>Team Size Overview</h3>
                <p className="wo-muted">Member count across teams</p>
            </div>

            {data.length === 0 ? (
                <div className="wo-chart-empty">No team data available.</div>
            ) : (
                <div className="wo-chart-wrap">
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="size" radius={[8, 8, 0, 0]} fill="#4f46e5" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}