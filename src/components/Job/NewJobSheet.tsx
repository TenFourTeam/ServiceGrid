import React, { useState } from 'react';
import { Job } from '@/types';
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { JobBottomModal } from '../Jobs/JobBottomModal';

interface NewJobSheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialDate?: Date;
  initialStartTime?: string;
  initialEndTime?: string;
}

export function NewJobSheet({ 
  open = false, 
  onOpenChange,
  initialDate,
  initialStartTime,
  initialEndTime
}: NewJobSheetProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleJobCreated = (job: Job) => {
    setModalOpen(false);
    onOpenChange?.(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          <Button>New Job</Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Create New Job</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <Button 
              onClick={() => setModalOpen(true)}
              className="w-full"
            >
              Create New Job
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <JobBottomModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initialDate={initialDate}
        initialStartTime={initialStartTime}
        initialEndTime={initialEndTime}
        onJobCreated={handleJobCreated}
      />
    </>
  );
}