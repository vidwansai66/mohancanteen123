import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMenuItems, MenuItem } from '@/hooks/useMenuItems';
import { useMyShop } from '@/hooks/useShops';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Pencil, Trash2, ImageOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

const categories = ['breakfast', 'lunch', 'snacks', 'drinks'] as const;

const ShopkeeperMenu = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { shop, isLoading: shopLoading } = useMyShop();
  const { menuItems, isLoading, addMenuItem, updateMenuItem, deleteMenuItem, toggleStock } = useMenuItems(shop?.id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', category: 'snacks' as MenuItem['category'], image_url: '' });

  const resetForm = () => setForm({ name: '', description: '', price: '', category: 'snacks', image_url: '' });

  if (shopLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!form.name || !form.price) {
      toast({ title: 'Please fill required fields', variant: 'destructive' });
      return;
    }
    if (editingItem) {
      await updateMenuItem(editingItem.id, { ...form, price: parseFloat(form.price) });
      toast({ title: 'Item updated' });
    } else {
      await addMenuItem({ ...form, price: parseFloat(form.price), in_stock: true, shop_id: shop?.id || null });
      toast({ title: 'Item added' });
    }
    setDialogOpen(false);
    resetForm();
    setEditingItem(null);
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setForm({ name: item.name, description: item.description || '', price: String(item.price), category: item.category, image_url: item.image_url || '' });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteMenuItem(id);
    toast({ title: 'Item deleted' });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 bg-background/95 backdrop-blur border-b border-border z-40 px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/shopkeeper')}><ArrowLeft className="w-5 h-5" /></Button>
            <h1 className="font-bold text-foreground">Menu Management</h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { resetForm(); setEditingItem(null); } }}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Item</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Price (₹) *</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                  <div><Label>Category</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as MenuItem['category'] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{categories.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." /></div>
                <Button className="w-full" onClick={handleSubmit}>{editingItem ? 'Update' : 'Add'} Item</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="px-4 py-6 max-w-4xl mx-auto">
        {menuItems.length === 0 && !isLoading ? (
          <Card className="p-12 text-center"><p className="text-muted-foreground">No menu items yet. Add your first item!</p></Card>
        ) : (
          <div className="space-y-3">
            {menuItems.map((item) => (
              <Card key={item.id} className="p-4 flex items-center gap-4">
                <div className="w-16 h-16 bg-secondary rounded-lg flex-shrink-0 overflow-hidden">
                  {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-6 h-6 text-muted-foreground" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{item.name}</h3>
                  <p className="text-sm text-muted-foreground capitalize">{item.category}</p>
                  <p className="text-primary font-bold">₹{Number(item.price).toFixed(0)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">Stock</span><Switch checked={item.in_stock} onCheckedChange={(v) => toggleStock(item.id, v)} /></div>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ShopkeeperMenu;
