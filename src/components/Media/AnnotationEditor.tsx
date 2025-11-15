import { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Arrow, Rect, Ellipse, Line, Text } from 'react-konva';
import { Button } from '@/components/ui/button';
import { Annotation } from '@/hooks/useJobMedia';
import { 
  MousePointer, 
  ArrowRight, 
  Square, 
  Circle, 
  Type, 
  Pencil, 
  Undo2, 
  Redo2, 
  Save,
  X 
} from 'lucide-react';
import Konva from 'konva';

interface AnnotationEditorProps {
  imageUrl: string;
  existingAnnotations?: Annotation[];
  onSave: (annotations: Annotation[]) => void;
  onCancel: () => void;
}

type Tool = 'select' | 'arrow' | 'rect' | 'ellipse' | 'text' | 'draw';

export function AnnotationEditor({ 
  imageUrl, 
  existingAnnotations = [], 
  onSave, 
  onCancel 
}: AnnotationEditorProps) {
  const [tool, setTool] = useState<Tool>('select');
  const [annotations, setAnnotations] = useState<Annotation[]>(existingAnnotations);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [color, setColor] = useState('#FF0000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [history, setHistory] = useState<Annotation[][]>([existingAnnotations]);
  const [historyStep, setHistoryStep] = useState(0);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  const stageRef = useRef<Konva.Stage>(null);
  const isDrawing = useRef(false);
  const currentShape = useRef<any>(null);

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      setImage(img);
      const maxWidth = 800;
      const scale = maxWidth / img.width;
      setDimensions({
        width: maxWidth,
        height: img.height * scale
      });
    };
  }, [imageUrl]);

  const addToHistory = (newAnnotations: Annotation[]) => {
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(newAnnotations);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
    setAnnotations(newAnnotations);
  };

  const undo = () => {
    if (historyStep > 0) {
      setHistoryStep(historyStep - 1);
      setAnnotations(history[historyStep - 1]);
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      setHistoryStep(historyStep + 1);
      setAnnotations(history[historyStep + 1]);
    }
  };

  const handleMouseDown = (e: any) => {
    if (tool === 'select') return;
    
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    
    const newAnnotation: Annotation = {
      id: `annotation-${Date.now()}`,
      type: tool === 'draw' ? 'path' : tool as any,
      x: pos.x,
      y: pos.y,
      stroke: color,
      strokeWidth,
      created_by: 'current_user',
      created_at: new Date().toISOString(),
    };

    if (tool === 'draw') {
      newAnnotation.points = [0, 0];
    } else if (tool === 'rect' || tool === 'ellipse') {
      newAnnotation.width = 0;
      newAnnotation.height = 0;
      newAnnotation.fill = 'transparent';
    } else if (tool === 'arrow') {
      newAnnotation.points = [0, 0, 0, 0];
    } else if (tool === 'text') {
      newAnnotation.text = 'Double-click to edit';
      newAnnotation.width = 200;
    }

    currentShape.current = newAnnotation;
    setAnnotations([...annotations, newAnnotation]);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current || tool === 'select' || !currentShape.current) return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    const lastAnnotation = { ...currentShape.current };

    if (tool === 'draw') {
      const newPoints = [...lastAnnotation.points, point.x - lastAnnotation.x, point.y - lastAnnotation.y];
      lastAnnotation.points = newPoints;
    } else if (tool === 'rect' || tool === 'ellipse') {
      lastAnnotation.width = point.x - lastAnnotation.x;
      lastAnnotation.height = point.y - lastAnnotation.y;
    } else if (tool === 'arrow') {
      lastAnnotation.points = [0, 0, point.x - lastAnnotation.x, point.y - lastAnnotation.y];
    }

    currentShape.current = lastAnnotation;
    setAnnotations([...annotations.slice(0, -1), lastAnnotation]);
  };

  const handleMouseUp = () => {
    if (isDrawing.current) {
      addToHistory(annotations);
      isDrawing.current = false;
      currentShape.current = null;
    }
  };

  const renderAnnotation = (annotation: Annotation) => {
    const commonProps = {
      key: annotation.id,
      id: annotation.id,
      x: annotation.x,
      y: annotation.y,
      stroke: annotation.stroke,
      strokeWidth: annotation.strokeWidth,
      onClick: () => setSelectedId(annotation.id),
      draggable: tool === 'select',
    };

    switch (annotation.type) {
      case 'arrow':
        return <Arrow {...commonProps} points={annotation.points} pointerLength={10} pointerWidth={10} />;
      case 'rect':
        return <Rect {...commonProps} width={annotation.width} height={annotation.height} fill={annotation.fill} />;
      case 'ellipse':
        return <Ellipse {...commonProps} radiusX={Math.abs(annotation.width! / 2)} radiusY={Math.abs(annotation.height! / 2)} fill={annotation.fill} />;
      case 'path':
        return <Line {...commonProps} points={annotation.points} tension={0.5} lineCap="round" lineJoin="round" />;
      case 'text':
        return <Text {...commonProps} text={annotation.text} fontSize={16} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex gap-2">
          {[
            { tool: 'select' as Tool, icon: MousePointer, label: 'Select' },
            { tool: 'arrow' as Tool, icon: ArrowRight, label: 'Arrow' },
            { tool: 'rect' as Tool, icon: Square, label: 'Rectangle' },
            { tool: 'ellipse' as Tool, icon: Circle, label: 'Circle' },
            { tool: 'text' as Tool, icon: Type, label: 'Text' },
            { tool: 'draw' as Tool, icon: Pencil, label: 'Draw' },
          ].map(({ tool: t, icon: Icon, label }) => (
            <Button
              key={t}
              variant={tool === t ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool(t)}
              title={label}
            >
              <Icon className="w-4 h-4" />
            </Button>
          ))}
          
          <div className="w-px bg-border mx-2" />
          
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 rounded border cursor-pointer"
            title="Color"
          />
          
          <input
            type="range"
            min="1"
            max="10"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-24"
            title="Stroke Width"
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={undo} disabled={historyStep === 0}>
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={redo} disabled={historyStep === history.length - 1}>
            <Redo2 className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button size="sm" onClick={() => onSave(annotations)}>
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-muted flex items-center justify-center p-4">
        <Stage
          ref={stageRef}
          width={dimensions.width}
          height={dimensions.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="bg-background shadow-lg"
        >
          <Layer>
            {image && <KonvaImage image={image} width={dimensions.width} height={dimensions.height} />}
            {annotations.map(renderAnnotation)}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
