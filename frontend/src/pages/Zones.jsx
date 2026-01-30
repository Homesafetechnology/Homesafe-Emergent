import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  Map, 
  Plus, 
  Pencil, 
  Trash2, 
  Radio,
  X,
  Image
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const DEFAULT_ZONE_IMAGES = [
  "https://images.unsplash.com/photo-1597665863042-47e00964d899?w=400",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400",
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
  "https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?w=400",
];

export default function Zones() {
  const [zones, setZones] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image_url: ""
  });

  const fetchData = useCallback(async () => {
    try {
      const [zonesRes, sensorsRes] = await Promise.all([
        axios.get(`${API}/zones`),
        axios.get(`${API}/sensors`)
      ]);
      setZones(zonesRes.data);
      setSensors(sensorsRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load zones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getSensorsByZone = (zoneId) => sensors.filter(s => s.zone_id === zoneId);

  const openCreateDialog = () => {
    setSelectedZone(null);
    setFormData({
      name: "",
      description: "",
      image_url: DEFAULT_ZONE_IMAGES[Math.floor(Math.random() * DEFAULT_ZONE_IMAGES.length)]
    });
    setDialogOpen(true);
  };

  const openEditDialog = (zone) => {
    setSelectedZone(zone);
    setFormData({
      name: zone.name,
      description: zone.description || "",
      image_url: zone.image_url || ""
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (zone) => {
    setSelectedZone(zone);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Zone name is required");
      return;
    }

    try {
      if (selectedZone) {
        await axios.put(`${API}/zones/${selectedZone.id}`, formData);
        toast.success("Zone updated");
      } else {
        await axios.post(`${API}/zones`, formData);
        toast.success("Zone created");
      }
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to save zone");
    }
  };

  const handleDelete = async () => {
    if (!selectedZone) return;
    try {
      await axios.delete(`${API}/zones/${selectedZone.id}`);
      toast.success("Zone deleted");
      setDeleteDialogOpen(false);
      setSelectedZone(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to delete zone");
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
    <div className="p-6 md:p-8 lg:p-12" data-testid="zones-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-manrope font-bold text-4xl tracking-tight text-slate-900">
            Zones
          </h1>
          <p className="text-slate-500 mt-1">Manage security zones in your home</p>
        </div>
        <Button onClick={openCreateDialog} data-testid="add-zone-btn">
          <Plus className="w-4 h-4 mr-2" />
          Add Zone
        </Button>
      </div>

      {/* Zones Grid */}
      {zones.length === 0 ? (
        <Card className="bento-card">
          <CardContent className="py-16 text-center">
            <Map className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No zones yet</h3>
            <p className="text-slate-500 mb-6">Create zones to organize your sensors by area</p>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Zone
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {zones.map((zone) => {
            const zoneSensors = getSensorsByZone(zone.id);
            const triggeredCount = zoneSensors.filter(s => s.status === "triggered").length;
            return (
              <Card 
                key={zone.id} 
                className={`bento-card overflow-hidden ${triggeredCount > 0 ? "ring-2 ring-rose-500" : ""}`}
                data-testid={`zone-${zone.id}`}
              >
                <div className="relative h-40">
                  <img
                    src={zone.image_url || DEFAULT_ZONE_IMAGES[0]}
                    alt={zone.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="zone-card-overlay absolute inset-0"></div>
                  <div className="absolute top-4 right-4 flex gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 bg-white/90 hover:bg-white"
                      onClick={() => openEditDialog(zone)}
                      data-testid={`edit-zone-${zone.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 bg-white/90 hover:bg-white text-rose-600 hover:text-rose-700"
                      onClick={() => openDeleteDialog(zone)}
                      data-testid={`delete-zone-${zone.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="absolute bottom-4 left-4">
                    <h3 className="text-white font-manrope font-bold text-xl">{zone.name}</h3>
                  </div>
                </div>
                <CardContent className="p-4">
                  {zone.description && (
                    <p className="text-slate-500 text-sm mb-4 line-clamp-2">{zone.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Radio className="w-4 h-4" />
                      <span className="text-sm">{zoneSensors.length} sensors</span>
                    </div>
                    {triggeredCount > 0 && (
                      <span className="text-xs px-2 py-1 bg-rose-100 text-rose-700 rounded-full font-medium">
                        {triggeredCount} triggered
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" data-testid="zone-dialog">
          <DialogHeader>
            <DialogTitle className="font-manrope">
              {selectedZone ? "Edit Zone" : "Create Zone"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Zone Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Living Room"
                  data-testid="zone-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this zone"
                  rows={3}
                  data-testid="zone-description-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image_url">Image URL (optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="image_url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://..."
                    data-testid="zone-image-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setFormData({ 
                      ...formData, 
                      image_url: DEFAULT_ZONE_IMAGES[Math.floor(Math.random() * DEFAULT_ZONE_IMAGES.length)] 
                    })}
                  >
                    <Image className="w-4 h-4" />
                  </Button>
                </div>
                {formData.image_url && (
                  <div className="mt-2 rounded-lg overflow-hidden h-24">
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" data-testid="zone-save-btn">
                {selectedZone ? "Save Changes" : "Create Zone"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="delete-zone-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Zone?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedZone?.name}" and all its sensors. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700"
              data-testid="confirm-delete-zone"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
