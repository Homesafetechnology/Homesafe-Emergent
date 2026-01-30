import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  Shield, 
  ShieldOff, 
  Eye, 
  Activity, 
  DoorOpen, 
  Radio,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Map
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Dashboard() {
  const [systemMode, setSystemMode] = useState("disarmed");
  const [stats, setStats] = useState({
    zones_count: 0,
    sensors_count: 0,
    triggered_count: 0,
    recent_events: []
  });
  const [zones, setZones] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [stateRes, statsRes, zonesRes, sensorsRes] = await Promise.all([
        axios.get(`${API}/system/state`),
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/zones`),
        axios.get(`${API}/sensors`)
      ]);
      setSystemMode(stateRes.data.mode);
      setStats(statsRes.data);
      setZones(zonesRes.data);
      setSensors(sensorsRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const updateSystemMode = async (newMode) => {
    try {
      await axios.put(`${API}/system/state`, { mode: newMode });
      setSystemMode(newMode);
      const modeLabels = {
        armed: "System Armed",
        disarmed: "System Disarmed",
        monitoring: "Monitoring Mode Enabled"
      };
      toast.success(modeLabels[newMode]);
      fetchData();
    } catch (error) {
      toast.error("Failed to update system state");
    }
  };

  const getSensorsByZone = (zoneId) => sensors.filter(s => s.zone_id === zoneId);

  const getZoneSensorStatus = (zoneId) => {
    const zoneSensors = getSensorsByZone(zoneId);
    if (zoneSensors.some(s => s.status === "triggered")) return "triggered";
    if (zoneSensors.every(s => s.status === "active")) return "active";
    return "inactive";
  };

  const formatTimeAgo = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 lg:p-12" data-testid="dashboard">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-manrope font-bold text-4xl tracking-tight text-slate-900">
          Dashboard
        </h1>
        <p className="text-slate-500 mt-1">Monitor and control your home security</p>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
        
        {/* System Status Card - Large */}
        <Card 
          className={`lg:col-span-5 overflow-hidden ${
            systemMode === "armed" ? "armed-glow border-rose-300" : 
            systemMode === "monitoring" ? "border-amber-300" : "disarmed-glow border-emerald-300"
          }`}
          data-testid="system-status-card"
        >
          <CardContent className="p-6">
            <div className={`w-full py-8 rounded-xl flex flex-col items-center justify-center ${
              systemMode === "armed" 
                ? "bg-gradient-to-br from-rose-500 to-red-600" 
                : systemMode === "monitoring"
                ? "bg-gradient-to-br from-amber-400 to-orange-500"
                : "bg-gradient-to-br from-emerald-400 to-teal-500"
            }`}>
              {systemMode === "armed" ? (
                <Shield className="w-16 h-16 text-white mb-3" />
              ) : systemMode === "monitoring" ? (
                <Eye className="w-16 h-16 text-white mb-3" />
              ) : (
                <ShieldOff className="w-16 h-16 text-white mb-3" />
              )}
              <span className="text-white font-manrope font-bold text-2xl uppercase tracking-wide">
                {systemMode === "monitoring" ? "Monitoring" : systemMode}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <Button
                onClick={() => updateSystemMode("armed")}
                variant={systemMode === "armed" ? "default" : "outline"}
                className={`h-12 ${systemMode === "armed" ? "bg-rose-600 hover:bg-rose-700" : ""}`}
                data-testid="arm-button"
              >
                <Shield className="w-4 h-4 mr-2" />
                Arm
              </Button>
              <Button
                onClick={() => updateSystemMode("disarmed")}
                variant={systemMode === "disarmed" ? "default" : "outline"}
                className={`h-12 ${systemMode === "disarmed" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                data-testid="disarm-button"
              >
                <ShieldOff className="w-4 h-4 mr-2" />
                Disarm
              </Button>
              <Button
                onClick={() => updateSystemMode("monitoring")}
                variant={systemMode === "monitoring" ? "default" : "outline"}
                className={`h-12 ${systemMode === "monitoring" ? "bg-amber-600 hover:bg-amber-700" : ""}`}
                data-testid="monitor-button"
              >
                <Eye className="w-4 h-4 mr-2" />
                Monitor
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="lg:col-span-7 grid grid-cols-2 gap-4">
          <Card className="bento-card" data-testid="zones-stat">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Map className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Zones</p>
                <p className="text-3xl font-manrope font-bold text-slate-900">{stats.zones_count}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bento-card" data-testid="sensors-stat">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-violet-100 flex items-center justify-center">
                <Radio className="w-6 h-6 text-violet-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Sensors</p>
                <p className="text-3xl font-manrope font-bold text-slate-900">{stats.sensors_count}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bento-card" data-testid="triggered-stat">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                stats.triggered_count > 0 ? "bg-rose-100" : "bg-emerald-100"
              }`}>
                {stats.triggered_count > 0 ? (
                  <AlertTriangle className="w-6 h-6 text-rose-600" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                )}
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Triggered</p>
                <p className="text-3xl font-manrope font-bold text-slate-900">{stats.triggered_count}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bento-card" data-testid="status-overview">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Status</p>
                <p className="text-lg font-manrope font-bold text-slate-900">
                  {stats.triggered_count > 0 ? "Alert" : "Normal"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Zones Overview */}
        <Card className="lg:col-span-7" data-testid="zones-overview">
          <CardHeader className="pb-3">
            <CardTitle className="font-manrope text-xl">Zones Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {zones.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Map className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No zones configured</p>
                <p className="text-sm">Add zones in the Zones section</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {zones.map((zone) => {
                  const status = getZoneSensorStatus(zone.id);
                  const zoneSensors = getSensorsByZone(zone.id);
                  return (
                    <div
                      key={zone.id}
                      className={`relative rounded-xl overflow-hidden h-32 ${
                        status === "triggered" ? "ring-2 ring-rose-500 animate-pulse-danger" : ""
                      }`}
                      data-testid={`zone-card-${zone.id}`}
                    >
                      <img
                        src={zone.image_url || "https://images.unsplash.com/photo-1597665863042-47e00964d899?w=400"}
                        alt={zone.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="zone-card-overlay absolute inset-0"></div>
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-white font-semibold">{zone.name}</h3>
                            <p className="text-white/70 text-sm">{zoneSensors.length} sensors</p>
                          </div>
                          <Badge
                            className={`${
                              status === "triggered" ? "bg-rose-500" :
                              status === "active" ? "bg-emerald-500" : "bg-slate-500"
                            } text-white`}
                          >
                            {status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-5" data-testid="recent-activity">
          <CardHeader className="pb-3">
            <CardTitle className="font-manrope text-xl">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recent_events.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <History className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recent_events.map((event, idx) => (
                  <div
                    key={event.id || idx}
                    className={`p-3 rounded-lg border animate-slide-in ${
                      event.severity === "danger" ? "bg-rose-50 border-rose-200" :
                      event.severity === "warning" ? "bg-amber-50 border-amber-200" :
                      "bg-slate-50 border-slate-200"
                    }`}
                    data-testid={`event-${idx}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        event.severity === "danger" ? "bg-rose-100" :
                        event.severity === "warning" ? "bg-amber-100" : "bg-slate-100"
                      }`}>
                        {event.type === "intrusion" ? (
                          <AlertTriangle className={`w-4 h-4 ${
                            event.severity === "danger" ? "text-rose-600" : "text-amber-600"
                          }`} />
                        ) : event.type === "armed" || event.type === "disarmed" ? (
                          <Shield className="w-4 h-4 text-slate-600" />
                        ) : (
                          <Activity className="w-4 h-4 text-slate-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900 font-medium truncate">{event.message}</p>
                        <p className="text-xs text-slate-500 mt-1">{formatTimeAgo(event.timestamp)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Sensor Status */}
        <Card className="lg:col-span-12" data-testid="sensors-quick-view">
          <CardHeader className="pb-3">
            <CardTitle className="font-manrope text-xl">Active Sensors</CardTitle>
          </CardHeader>
          <CardContent>
            {sensors.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Radio className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No sensors configured</p>
                <p className="text-sm">Add sensors in the Sensors section</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {sensors.slice(0, 12).map((sensor) => {
                  const zone = zones.find(z => z.id === sensor.zone_id);
                  return (
                    <div
                      key={sensor.id}
                      className={`sensor-card ${
                        sensor.status === "triggered" ? "sensor-triggered" :
                        sensor.status === "active" ? "sensor-active" :
                        sensor.status === "offline" ? "sensor-offline" : "sensor-inactive"
                      }`}
                      data-testid={`sensor-quick-${sensor.id}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {sensor.type === "motion" ? (
                          <Activity className="w-4 h-4" />
                        ) : (
                          <DoorOpen className="w-4 h-4" />
                        )}
                        <span className="text-xs font-medium uppercase text-slate-500">
                          {sensor.type}
                        </span>
                      </div>
                      <p className="font-medium text-sm truncate">{sensor.name}</p>
                      <p className="text-xs text-slate-500 truncate">{zone?.name || "Unknown"}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Import History icon that was used but not imported
function History({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
      <path d="M12 7v5l4 2"/>
    </svg>
  );
}
