import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, FileCheck, ChevronRight } from "lucide-react";
import { SimilarTemplate } from "@/hooks/useChecklistGeneration";

interface SimilarTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  similarTemplates: SimilarTemplate[];
  generatedTitle: string;
  onUseTemplate: (templateId: string) => void;
  onCreateNew: () => void;
}

export function SimilarTemplatesDialog({
  open,
  onOpenChange,
  similarTemplates,
  generatedTitle,
  onUseTemplate,
  onCreateNew,
}: SimilarTemplatesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle>Similar Templates Found</DialogTitle>
          </div>
          <DialogDescription>
            We found existing templates similar to "{generatedTitle}". 
            Using an existing template ensures consistency across your team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {similarTemplates.map((template) => (
            <Card key={template.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-base truncate">{template.name}</CardTitle>
                      <Badge 
                        variant={template.similarity >= 80 ? "default" : "secondary"}
                        className="shrink-0"
                      >
                        {template.similarity}% match
                      </Badge>
                    </div>
                    {template.description && (
                      <CardDescription className="text-sm line-clamp-2">
                        {template.description}
                      </CardDescription>
                    )}
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => onUseTemplate(template.id)}
                    className="shrink-0"
                  >
                    Use Template
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {template.category && (
                    <span className="flex items-center gap-1">
                      <FileCheck className="h-3.5 w-3.5" />
                      {template.category}
                    </span>
                  )}
                  {template.is_system_template && (
                    <Badge variant="outline" className="text-xs">
                      System Template
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Or create a new custom checklist from AI suggestions
            </p>
            <Button variant="outline" onClick={onCreateNew}>
              Create New Checklist
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
