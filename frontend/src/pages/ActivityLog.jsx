import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  History, 
  Trash2, 
  AlertTriangle,
  Shield,
  ShieldOff,
  Eye,
  Activity,
  Radio,
  Map,
  MessageSquare,
  Settings,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const getEventIcon = (type) => {
  switch (type) {
    case "intrusion":
      return AlertTriangle;
    case "armed":
      return Shield;
    case "disarmed":
      return ShieldOff;
    case "monitor_start":
    case "monitor_stop":
      return Eye;
    case "sensor_triggered":
      return Activity;
    case "sensor_added":
    case "sensor_removed":
      return Radio;
    case "zone_added":
    case "zone_removed":
      return Map;
    case "sms_sent":
      return MessageSquare;
    default:
      return Settings;
  }
};

const getEventColor = (severity) => {
  switch (severity) {
    case "danger":
      return {
        bg: "bg-rose-50",
        border: "border-rose-200",
        icon: "bg-rose-100 text-rose-600",
        badge: "bg-rose-100 text-rose-700"
      };
    case "warning":
      return {
        bg: "bg-amber-50",
        border: "border-amber-200",
        icon: "bg-amber-100 text-amber-600",
        badge: "bg-amber-100 text-amber-700"
      };
    default:
      return {
        bg: "bg-slate-50",
        border: "border-slate-200",
        icon: "bg-slate-100 text-slate-600",
        badge: "bg-slate-100 text-slate-600"
      };
  }
};

export default function ActivityLog() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/events?limit=100`);
      setEvents(response.data);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 5000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const clearEvents = async () => {
    try {
      await axios.delete(`${API}/events`);
      toast.success("Activity log cleared");
      setClearDialogOpen(false);
      fetchEvents();
    } catch (error) {
      toast.error("Failed to clear activity log");
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return date.toLocaleString([], { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const groupEventsByDate = (events) => {
    const groups = {};
    events.forEach(event => {
      const date = new Date(event.timestamp).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
    });
    return groups;
  };

  const getDateLabel = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return "Today";
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    
    return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  const groupedEvents = groupEventsByDate(events);

  return (
    <div className="p-6 md:p-8 lg:p-12" data-testid="activity-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-manrope font-bold text-4xl tracking-tight text-slate-900">
            Activity Log
          </h1>
          <p className="text-slate-500 mt-1">View system events and alerts history</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchEvents} data-testid="refresh-events-btn">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            className="text-rose-600 hover:text-rose-700"
            onClick={() => setClearDialogOpen(true)}
            disabled={events.length === 0}
            data-testid="clear-events-btn"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Log
          </Button>
        </div>
      </div>

      {/* Events List */}
      {events.length === 0 ? (
        <Card className="bento-card">
          <CardContent className="py-16 text-center">
            <History className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No activity yet</h3>
            <p className="text-slate-500">System events and alerts will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedEvents).map(([date, dateEvents]) => (
            <div key={date}>
              <h2 className="font-manrope font-semibold text-lg text-slate-900 mb-4">
                {getDateLabel(date)}
              </h2>
              <div className="space-y-3">
                {dateEvents.map((event, idx) => {
                  const Icon = getEventIcon(event.type);
                  const colors = getEventColor(event.severity);
                  return (
                    <div
                      key={event.id || idx}
                      className={`p-4 rounded-xl border ${colors.bg} ${colors.border} animate-slide-in`}
                      data-testid={`event-item-${idx}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.icon}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="text-slate-900 font-medium">{event.message}</p>
                              <p className="text-sm text-slate-500 mt-1">
                                {formatTimestamp(event.timestamp)}
                              </p>
                            </div>
                            <Badge className={colors.badge}>
                              {event.type.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Clear Confirmation Dialog */}
      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent data-testid="clear-events-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Activity Log?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {events.length} events from the activity log. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={clearEvents}
              className="bg-rose-600 hover:bg-rose-700"
              data-testid="confirm-clear-events"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
