import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Copy, Link, Code } from "lucide-react";
import { toast } from "sonner";
import { useBusinessContext } from "@/hooks/useBusinessContext";

interface RequestShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EmbedSettings {
  buttonColor: string;
  textColor: string;
}

export function RequestShareModal({ 
  open, 
  onOpenChange
}: RequestShareModalProps) {
  const { business } = useBusinessContext();
  const [activeTab, setActiveTab] = useState("share-link");
  const [embedSettings, setEmbedSettings] = useState<EmbedSettings>({
    buttonColor: "#7db00e",
    textColor: "#ffffff"
  });

  // Generate the public request form URL
  const generateShareUrl = () => {
    if (!business?.id) return "";
    return `${window.location.origin}/request/${business.id}`;
  };

  // Generate the embed code with full iframe
  const generateEmbedCode = () => {
    const shareUrl = generateShareUrl();
    if (!shareUrl) return "";
    const iframeId = `request-form-${business.id}`;
    
    return `<!-- Service Request Form Embed -->
<div style="width: 100%; max-width: 800px; margin: 0 auto;">
  <iframe 
    id="${iframeId}"
    src="${shareUrl}" 
    style="width: 100%; height: 800px; border: none; border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);"
    title="Service Request Form"
    scrolling="yes"
    frameborder="0">
  </iframe>
</div>

<script>
  // Auto-resize iframe based on content (optional)
  window.addEventListener('message', function(e) {
    if (e.origin !== '${window.location.origin}') return;
    if (e.data.type === 'resize' && e.data.frameId === '${iframeId}') {
      var iframe = document.getElementById('${iframeId}');
      if (iframe) {
        iframe.style.height = e.data.height + 'px';
      }
    }
  });
</script>`;
  };

  const copyToClipboard = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleColorChange = (type: 'buttonColor' | 'textColor', color: string) => {
    setEmbedSettings(prev => ({
      ...prev,
      [type]: color
    }));
  };

  const shareUrl = generateShareUrl();
  const embedCode = generateEmbedCode();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Share Request Form</DrawerTitle>
        </DrawerHeader>
        
        <div className="px-4 pb-4 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="share-link" className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                Share Link
              </TabsTrigger>
              <TabsTrigger value="embed-form" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Embed Form
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="share-link" className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Share your public <span className="text-primary font-medium">client hub</span> request form link. 
                  This link will work anywhere — including on social media, through email, or text messages.
                </p>
                
                <div className="space-y-2">
                  <Label htmlFor="share-url">Request Form URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="share-url"
                      value={shareUrl}
                      readOnly
                      className="bg-muted"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(shareUrl, "URL copied to clipboard")}
                      className="shrink-0"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy URL
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="embed-form" className="space-y-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Embed the complete request form on your website. This creates a full iframe with the entire form, 
                  making it easy for customers to submit requests directly from your site.
                </p>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Customize button appearance</h4>
                    
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="button-color">Button color</Label>
                        <div className="flex gap-2 items-center">
                          <div 
                            className="w-8 h-8 rounded border border-border cursor-pointer"
                            style={{ backgroundColor: embedSettings.buttonColor }}
                            onClick={() => document.getElementById('button-color-input')?.click()}
                          />
                          <Input
                            id="button-color-input"
                            type="color"
                            value={embedSettings.buttonColor}
                            onChange={(e) => handleColorChange('buttonColor', e.target.value)}
                            className="sr-only"
                          />
                          <Input
                            value={embedSettings.buttonColor}
                            onChange={(e) => handleColorChange('buttonColor', e.target.value)}
                            placeholder="#7db00e"
                            className="flex-1"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="text-color">Text color</Label>
                        <div className="flex gap-2 items-center">
                          <div 
                            className="w-8 h-8 rounded border border-border cursor-pointer"
                            style={{ backgroundColor: embedSettings.textColor }}
                            onClick={() => document.getElementById('text-color-input')?.click()}
                          />
                          <Input
                            id="text-color-input"
                            type="color"
                            value={embedSettings.textColor}
                            onChange={(e) => handleColorChange('textColor', e.target.value)}
                            className="sr-only"
                          />
                          <Input
                            value={embedSettings.textColor}
                            onChange={(e) => handleColorChange('textColor', e.target.value)}
                            placeholder="#ffffff"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Button preview</h4>
                    <Card className="p-6 flex items-center justify-center min-h-[120px] bg-muted/50">
                      <button
                        style={{
                          backgroundColor: embedSettings.buttonColor,
                          color: embedSettings.textColor,
                          border: 'none',
                          padding: '12px 24px',
                          borderRadius: '6px',
                          fontSize: '16px',
                          fontWeight: '500',
                          cursor: 'pointer'
                        }}
                      >
                        Submit Request
                      </button>
                    </Card>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="embed-code">Copy and paste the following code on your website:</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(embedCode, "Embed code copied to clipboard")}
                      className="w-fit"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy Code
                    </Button>
                  </div>
                  <Textarea
                    id="embed-code"
                    value={embedCode}
                    readOnly
                    rows={8}
                    className="bg-muted font-mono text-sm"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  );
}