"use client";

import { Gamepad2 } from "lucide-react";
import { SafeImage } from "./SafeImage";
import { activityVerb, appIconUrl, assetUrl, formatClock, formatDuration, type Activity } from "@/lib/lanyard";

export function ActivityCard({ activity, now }: { activity: Activity; now: number | null }) {
  const { assets, application_id: appId, timestamps } = activity;
  const large = assetUrl(assets?.large_image, appId);
  const small = assetUrl(assets?.small_image, appId);

  let time: string | null = null;
  if (now !== null) {
    if (timestamps?.end && timestamps.end > now) time = `${formatClock(timestamps.end - now)} left`;
    else if (timestamps?.start && timestamps.start <= now)
      time = `${activityVerb(activity.type).replace(/ (to|in)$/, "")} for ${formatDuration(now - timestamps.start)}`;
  }

  return (
    <div className="lg-well flex gap-3.5 rounded-2xl p-3">
      <div className="relative size-[60px] shrink-0">
        <SafeImage
          src={[large, appIconUrl(appId)]}
          alt={assets?.large_text ?? activity.name}
          title={assets?.large_text}
          className="size-full rounded-[12px] object-cover shadow-[0_0_0_1px_rgb(255_255_255/0.06)]"
          fallback={
            <div className="flex size-full items-center justify-center rounded-[12px] bg-white/[0.05] text-white/35 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.05)]">
              <Gamepad2 className="size-6" strokeWidth={1.6} />
            </div>
          }
        />
        {small && large && (
          <SafeImage
            src={small}
            alt={assets?.small_text ?? ""}
            title={assets?.small_text}
            className="absolute -right-1.5 -bottom-1.5 size-[22px] rounded-full bg-[var(--surface)] object-cover ring-[3px] ring-[var(--surface)]"
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <p className="text-[10.5px] font-semibold tracking-[0.09em] text-white/35 uppercase">
          {activityVerb(activity.type)}
        </p>
        <p className="mt-0.5 truncate text-[14.5px] leading-tight font-semibold tracking-[-0.01em] text-white/95">
          {activity.name}
        </p>
        {activity.details && <p className="mt-0.5 truncate text-[13px] text-white/60">{activity.details}</p>}
        {activity.state && <p className="truncate text-[13px] text-white/50">{activity.state}</p>}
        {time && <p className="mt-0.5 text-[12px] text-white/38 tabular-nums">{time}</p>}
      </div>
    </div>
  );
}
