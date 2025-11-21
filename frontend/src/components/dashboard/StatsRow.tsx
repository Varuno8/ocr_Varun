import { Activity, AlertCircle, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { useStats } from '../../hooks/useDashboardData';

const cards = [
  { label: 'Documents Scanned Today', icon: Activity },
  { label: 'Pending Validations', icon: Clock3 },
  { label: 'Accuracy Score', icon: ShieldCheck },
  { label: 'Synced to HIS', icon: CheckCircle2 },
];

export function StatsRow() {
  const { data, error } = useStats();
  const values = data || { pending: 8, scannedToday: 132, accuracy: 98.4, syncedToHis: true };

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Live stats unavailable</p>
            <p className="text-xs text-amber-700">{error.message}</p>
          </div>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          const value = idx === 0 ? values.scannedToday : idx === 1 ? values.pending : idx === 2 ? `${values.accuracy}%` : values.syncedToHis ? 'Yes' : 'No';
          const trend = idx === 0 ? '+12 vs yesterday' : idx === 1 ? '-3 vs last hour' : idx === 2 ? '+0.2% week' : 'Live sync';
          return (
            <Card key={card.label} className="hover-lift">
              <CardContent className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm text-muted">{card.label}</p>
                  <p className="text-2xl font-semibold text-text">{value}</p>
                  <p className="text-xs text-muted">{trend}</p>
                </div>
                <Badge variant="outline" className="h-10 w-10 items-center justify-center rounded-full">
                  <Icon className="h-5 w-5 text-primary" />
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
