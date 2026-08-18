import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/admin-auth";
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
} from "@/services/notifications";
import { timedRoute } from "@/lib/perf-timing";

export const GET = timedRoute("GET /api/notifications", async () => {
  const user = await requireAuthApi();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [notifications, unreadCount] = await Promise.all([
      listNotifications(user.id),
      getUnreadNotificationCount(user.id),
    ]);

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        href: n.href,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
    });
  } catch (error) {
    console.error("[api/notifications GET]", error);
    return NextResponse.json({ error: "Could not load notifications." }, { status: 500 });
  }
});

export async function POST(req: Request) {
  const user = await requireAuthApi();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (body?.action !== "read_all") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const marked = await markAllNotificationsRead(user.id);
    return NextResponse.json({ success: true, marked });
  } catch (error) {
    console.error("[api/notifications POST]", error);
    return NextResponse.json({ error: "Could not update notifications." }, { status: 500 });
  }
}
