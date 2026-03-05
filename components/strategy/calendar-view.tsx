import { Badge } from "@/components/ui/badge";
import type { CalendarEntry } from "@/types/strategy";
import {
  Camera,
  Facebook,
  FileText,
  MessageCircle,
  Music2,
  Twitter,
  Youtube,
} from "lucide-react";

interface CalendarViewProps {
  entries: CalendarEntry[];
}

const contentTypeLabel: Record<CalendarEntry["content_type"], string> = {
  text: "テキスト",
  image: "画像",
  video_script: "動画台本",
};

const contentTypeClass: Record<CalendarEntry["content_type"], string> = {
  text: "bg-muted text-muted-foreground border-transparent",
  image: "bg-blue-100 text-blue-800 border-transparent",
  video_script: "bg-purple-100 text-purple-800 border-transparent",
};

const priorityClass: Record<CalendarEntry["priority"], string> = {
  high: "bg-red-100 text-red-800 border-transparent",
  medium: "bg-yellow-100 text-yellow-800 border-transparent",
  low: "bg-green-100 text-green-800 border-transparent",
};

function getPlatformIcon(platform: string) {
  switch (platform) {
    case "instagram":
      return Camera;
    case "youtube":
      return Youtube;
    case "x":
      return Twitter;
    case "tiktok":
      return Music2;
    case "facebook":
      return Facebook;
    case "line":
      return MessageCircle;
    default:
      return FileText;
  }
}

function toDateOnlyKey(dateIso: string) {
  return new Date(dateIso).toISOString().slice(0, 10);
}

function getStartOfWeek(date: Date) {
  const base = new Date(date);
  const currentDay = base.getDay();
  const diff = currentDay === 0 ? -6 : 1 - currentDay;
  base.setDate(base.getDate() + diff);
  base.setHours(0, 0, 0, 0);
  return base;
}

function buildWeekDays(entries: CalendarEntry[]) {
  const referenceDate = entries[0]?.day ? new Date(entries[0].day) : new Date();
  const start = getStartOfWeek(referenceDate);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

const weekdayLabel = ["月", "火", "水", "木", "金", "土", "日"];

export function CalendarView({ entries }: CalendarViewProps) {
  const grouped = entries.reduce<Record<string, CalendarEntry[]>>((acc, entry) => {
    const key = toDateOnlyKey(entry.day);
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  const weekDays = buildWeekDays(entries);

  return (
    <section className="space-y-3" aria-label="週間カレンダー">
      <div className="rounded-md border bg-card p-3 sm:p-4">
        <div className="space-y-3 md:hidden">
          {weekDays.map((day, index) => {
            const dayKey = toDateOnlyKey(day.toISOString());
            const dayEntries = grouped[dayKey] || [];
            return (
              <div key={dayKey} className="rounded-md border bg-muted/50 p-3">
                <p className="mb-2 text-sm font-semibold text-foreground">
                  {weekdayLabel[index]} {day.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
                </p>
                {dayEntries.length === 0 ? (
                  <p className="text-xs text-muted-foreground">投稿予定なし</p>
                ) : (
                  <div className="space-y-2">
                    {dayEntries.map((entry, entryIndex) => {
                      const Icon = getPlatformIcon(entry.platform);
                      return (
                        <div key={`${dayKey}-${entry.platform}-${entryIndex}`} className="rounded-md border bg-card p-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Icon className="h-4 w-4 text-primary" />
                            <span className="font-medium text-foreground">{entry.topic}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <Badge className={contentTypeClass[entry.content_type]}>
                              {contentTypeLabel[entry.content_type]}
                            </Badge>
                            <Badge className={priorityClass[entry.priority]}>{entry.priority}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="hidden grid-cols-7 gap-3 md:grid">
          {weekDays.map((day, index) => {
            const dayKey = toDateOnlyKey(day.toISOString());
            const dayEntries = grouped[dayKey] || [];
            return (
              <div key={dayKey} className="min-h-44 rounded-md border bg-muted/50 p-3">
                <p className="mb-3 text-sm font-semibold text-foreground">
                  {weekdayLabel[index]} {day.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
                </p>
                {dayEntries.length === 0 ? (
                  <p className="text-xs text-muted-foreground">投稿予定なし</p>
                ) : (
                  <div className="space-y-2">
                    {dayEntries.map((entry, entryIndex) => {
                      const Icon = getPlatformIcon(entry.platform);
                      return (
                        <div key={`${dayKey}-${entry.platform}-${entryIndex}`} className="rounded-md border bg-card p-2">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Icon className="h-3.5 w-3.5 text-primary" />
                            <span className="font-medium text-foreground">{entry.topic}</span>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            <Badge className={contentTypeClass[entry.content_type]}>
                              {contentTypeLabel[entry.content_type]}
                            </Badge>
                            <Badge className={priorityClass[entry.priority]}>{entry.priority}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
