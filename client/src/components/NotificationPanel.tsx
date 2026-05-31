import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Bell, Check, CheckCheck, X, AlertTriangle, Mail, Zap, Clock, Users, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

const typeIcons: Record<string, React.ReactNode> = {
  new_lead: <Mail className="w-4 h-4 text-blue-500" />,
  high_value_lead: <Zap className="w-4 h-4 text-amber-500" />,
  qr_scan: <Zap className="w-4 h-4 text-purple-500" />,
  deadline_escalation: <AlertTriangle className="w-4 h-4 text-red-500" />,
  daily_briefing: <Clock className="w-4 h-4 text-sky-500" />,
  neighbor_trigger: <Users className="w-4 h-4 text-green-500" />,
  inspection_followup: <AlertTriangle className="w-4 h-4 text-orange-500" />,
  milestone: <Trophy className="w-4 h-4 text-yellow-500" />,
  status_change: <Check className="w-4 h-4 text-gray-500" />,
};

const priorityColors: Record<string, string> = {
  urgent: "bg-red-100 border-red-300 text-red-800",
  high: "bg-amber-50 border-amber-200 text-amber-800",
  medium: "bg-white border-gray-200 text-gray-800",
  low: "bg-gray-50 border-gray-100 text-gray-600",
};

export function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false);

  const { data: unreadCount = 0 } = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 30000, // Poll every 30s
  });

  const { data: notifications = [], refetch } = trpc.notifications.list.useQuery(
    { limit: 30, unreadOnly: false },
    { enabled: isOpen }
  );

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => refetch(),
  });

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => refetch(),
  });

  return (
    <div className="relative">
      {/* Bell Button */}
      <Button
        variant="ghost"
        size="sm"
        className="relative p-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 w-[380px] max-h-[500px] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount} new
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={() => markAllRead.mutate()}
                  >
                    <CheckCheck className="w-3 h-3 mr-1" />
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Notification List */}
            <ScrollArea className="max-h-[420px]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Bell className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                        !notif.read ? "bg-blue-50/50 border-l-2 border-l-blue-500" : ""
                      }`}
                      onClick={() => {
                        if (!notif.read) markRead.mutate({ id: notif.id });
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          {typeIcons[notif.type] || <Bell className="w-4 h-4 text-gray-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className={`text-sm font-medium truncate ${!notif.read ? "text-gray-900" : "text-gray-600"}`}>
                              {notif.title.length > 60 ? notif.title.slice(0, 60) + "..." : notif.title}
                            </p>
                            {notif.priority === "urgent" && (
                              <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                                URGENT
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-2">
                            {notif.content.split("\n")[0]}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        {!notif.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
}
