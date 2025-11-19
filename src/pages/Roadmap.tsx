import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus } from 'lucide-react';
import { TopNav } from '@/landing/components/TopNav';
import { Footer } from '@/landing/components/Footer';
import { useRoadmapFeatures } from '@/hooks/useRoadmapFeatures';
import { StatusFilter } from '@/components/Roadmap/StatusFilter';
import { RoadmapFeatureCard } from '@/components/Roadmap/RoadmapFeatureCard';
import { AddFeatureDialog } from '@/components/Roadmap/AddFeatureDialog';

export default function Roadmap() {
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'votes' | 'newest' | 'oldest'>('newest');
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { data: features, isLoading } = useRoadmapFeatures({
    status: selectedStatus === 'all' ? undefined : selectedStatus,
    sortBy,
  });

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />

      <main className="flex-1 container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
          {/* Sidebar */}
          <aside className="space-y-6">
            <StatusFilter
              features={features || []}
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
            />
          </aside>

          {/* Main Content */}
          <div className="space-y-6">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold">ServiceGrid Feature Roadmap</h1>
                  <p className="text-muted-foreground mt-2">
                    Vote for features you'd like to see and track our progress
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="votes">Most Votes</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Feature
                </Button>
              </div>
            </div>

            {/* Features Grid */}
            {isLoading ? (
              <div className="grid gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-48 w-full" />
                ))}
              </div>
            ) : features && features.length > 0 ? (
              <div className="grid gap-4">
                {features.map((feature) => (
                  <RoadmapFeatureCard key={feature.id} feature={feature} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {selectedStatus === 'all'
                    ? 'No features yet. Be the first to suggest one!'
                    : 'No features in this category yet.'}
                </p>
                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Feature
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      <AddFeatureDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </div>
  );
}
