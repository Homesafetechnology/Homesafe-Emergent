import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  Radio, 
  Plus, 
  Pencil, 
  Trash2, 
  Activity,
  DoorOpen,
  Maximize,
  Zap,
  RotateCcw,
  Battery,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

const SENSOR_TYPES = [
  { value: "motion", label: "Motion Sensor", icon: Activity },
  { value: "door", label: "Door Sensor", icon: DoorOpen },
  { value: "window", label: "Window Sensor", icon: Maximize },
];

export default function Sensors() {
  const [sensors, setSensors] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [filterZone, setFilterZone] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [formData, setFormData] = useState({
    name: "",
    type: "motion",
    zone_id: "",
    battery_level: 100
  });

  const fetchData = useCallback(async () => {
    try {
      const [sensorsRes, zonesRes] = await Promise.all([
        axios.get(`${API}/sensors`),
        axios.get(`${API}/zones`)
      ]);
      setSensors(sensorsRes.data);
      setZones(zonesRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load sensors");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getZoneName = (zoneId) => {
    const zone = zones.find(z => z.id === zoneId);
    return zone?.name || "Unknown Zone";
  };

  const getSensorIcon = (type) => {
    const sensorType = SENSOR_TYPES.find(t => t.value === type);
    return sensorType?.icon || Radio;
  };

  const filteredSensors = sensors.filter(sensor => {
    if (filterZone !== "all" && sensor.zone_id !== filterZone) return false;
    if (filterType !== "all" && sensor.type !== filterType) return false;
    return true;
  });

  const openCreateDialog = () => {
    setSelectedSensor(null);
    setFormData({
      name: "",
      type: "motion",
      zone_id: zones[0]?.id || "",
      battery_level: 100
    });
    setDialogOpen(true);
  };

  const openEditDialog = (sensor) => {
    setSelectedSensor(sensor);
    setFormData({
      name: sensor.name,
      type: sensor.type,
      zone_id: sensor.zone_id,
      battery_level: sensor.battery_level
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (sensor) => {
    setSelectedSensor(sensor);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Sensor name is required");
      return;
    }
    if (!formData.zone_id) {
      toast.error("Please select a zone");
      return;
    }

    try {
      if (selectedSensor) {
        await axios.put(`${API}/sensors/${selectedSensor.id}`, formData);
        toast.success("Sensor updated");
      } else {
        await axios.post(`${API}/sensors`, formData);
        toast.success("Sensor created");
      }
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to save sensor");
    }
  };

  const handleDelete = async () => {
    if (!selectedSensor) return;
    try {
      await axios.delete(`${API}/sensors/${selectedSensor.id}`);
      toast.success("Sensor deleted");
      setDeleteDialogOpen(false);
      setSelectedSensor(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to delete sensor");
    }
  };

  const triggerSensor = async (sensorId) => {
    try {
      const response = await axios.post(`${API}/sensors/trigger`, { sensor_id: sensorId });
      if (response.data.alert) {
        toast.error(response.data.message, { duration: 5000 });
      } else if (response.data.severity === "warning") {
        toast.warning(response.data.message);
      } else {
        toast.info(response.data.message);
      }
      fetchData();
    } catch (error) {
      toast.error("Failed to trigger sensor");
    }
  };

  const resetSensor = async (sensorId) => {
    try {
      await axios.post(`${API}/sensors/${sensorId}/reset`);
      toast.success("Sensor reset");
      fetchData();
    } catch (error) {
      toast.error("Failed to reset sensor");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 lg:p-12" data-testid="sensors-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-manrope font-bold text-4xl tracking-tight text-slate-900">
            Sensors
          </h1>
          <p className="text-slate-500 mt-1">Manage and monitor your security sensors</p>
        </div>
        <Button 
          onClick={openCreateDialog} 
          disabled={zones.length === 0}
          data-testid="add-sensor-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Sensor
        </Button>
      </div>

      {zones.length === 0 ? (
        <Card className="bento-card">
          <CardContent className="py-16 text-center">
            <Radio className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Create a zone first</h3>
            <p className="text-slate-500 mb-6">You need at least one zone before adding sensors</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-slate-500">Zone:</Label>
              <Select value={filterZone} onValueChange={setFilterZone}>
                <SelectTrigger className="w-40" data-testid="filter-zone">
                  <SelectValue placeholder="All zones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Zones</SelectItem>
                  {zones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-slate-500">Type:</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40" data-testid="filter-type">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {SENSOR_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sensors Grid */}
          {filteredSensors.length === 0 ? (
            <Card className="bento-card">
              <CardContent className="py-16 text-center">
                <Radio className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No sensors found</h3>
                <p className="text-slate-500">
                  {sensors.length === 0 
                    ? "Add your first sensor to get started" 
                    : "No sensors match your filters"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSensors.map((sensor) => {
                const SensorIcon = getSensorIcon(sensor.type);
                return (
                  <Card 
                    key={sensor.id} 
                    className={`bento-card transition-all ${
                      sensor.status === "triggered" ? "ring-2 ring-rose-500 animate-pulse-danger" : ""
                    }`}
                    data-testid={`sensor-${sensor.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            sensor.status === "triggered" ? "bg-rose-100" :
                            sensor.status === "active" ? "bg-emerald-100" :
                            sensor.status === "offline" ? "bg-slate-200" : "bg-slate-100"
                          }`}>
                            <SensorIcon className={`w-5 h-5 ${
                              sensor.status === "triggered" ? "text-rose-600" :
                              sensor.status === "active" ? "text-emerald-600" :
                              "text-slate-500"
                            }`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">{sensor.name}</h3>
                            <p className="text-sm text-slate-500">{getZoneName(sensor.zone_id)}</p>
                          </div>
                        </div>
                        <Badge className={`${
                          sensor.status === "triggered" ? "bg-rose-100 text-rose-700" :
                          sensor.status === "active" ? "bg-emerald-100 text-emerald-700" :
                          sensor.status === "offline" ? "bg-slate-200 text-slate-600" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {sensor.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 mb-4 text-sm">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Battery className={`w-4 h-4 ${
                            sensor.battery_level < 20 ? "text-rose-500" :
                            sensor.battery_level < 50 ? "text-amber-500" : "text-emerald-500"
                          }`} />
                          <span>{sensor.battery_level}%</span>
                        </div>
                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {sensor.type}
                        </span>
                      </div>

                      {sensor.last_triggered && (
                        <p className="text-xs text-slate-400 mb-4">
                          Last triggered: {new Date(sensor.last_triggered).toLocaleString()}
                        </p>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => triggerSensor(sensor.id)}
                          data-testid={`trigger-sensor-${sensor.id}`}
                        >
                          <Zap className="w-3 h-3 mr-1" />
                          Trigger
                        </Button>
                        {sensor.status === "triggered" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resetSensor(sensor.id)}
                            data-testid={`reset-sensor-${sensor.id}`}
                          >
                            <RotateCcw className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(sensor)}
                          data-testid={`edit-sensor-${sensor.id}`}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose-600 hover:text-rose-700"
                          onClick={() => openDeleteDialog(sensor)}
                          data-testid={`delete-sensor-${sensor.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" data-testid="sensor-dialog">
          <DialogHeader>
            <DialogTitle className="font-manrope">
              {selectedSensor ? "Edit Sensor" : "Add Sensor"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Sensor Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Front Door Sensor"
                  data-testid="sensor-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Sensor Type</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger data-testid="sensor-type-select">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SENSOR_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="w-4 h-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="zone">Zone</Label>
                <Select 
                  value={formData.zone_id} 
                  onValueChange={(value) => setFormData({ ...formData, zone_id: value })}
                >
                  <SelectTrigger data-testid="sensor-zone-select">
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="battery">Battery Level (%)</Label>
                <Input
                  id="battery"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.battery_level}
                  onChange={(e) => setFormData({ ...formData, battery_level: parseInt(e.target.value) || 0 })}
                  data-testid="sensor-battery-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" data-testid="sensor-save-btn">
                {selectedSensor ? "Save Changes" : "Add Sensor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="delete-sensor-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sensor?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedSensor?.name}". 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700"
              data-testid="confirm-delete-sensor"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
