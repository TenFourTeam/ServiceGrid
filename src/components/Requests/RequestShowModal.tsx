import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Mail, Phone, MapPin, Calendar, Clock, FileText, User, Camera } from "lucide-react";
import { format } from "date-fns";
import { RequestListItem } from "@/hooks/useRequestsData";
import { useCustomersData } from "@/hooks/useCustomersData";
import { statusOptions } from "@/validation/requests";
import { RequestEditModal } from "./RequestEditModal";
import { RequestActions } from "./RequestActions";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuthApi } from '@/hooks/useAuthApi';
import { useCreateQuote } from "@/hooks/useQuoteOperations";
import { useLifecycleEmailIntegration } from "@/hooks/useLifecycleEmailIntegration";
import { useRequestOperations } from "@/hooks/useRequestOperations";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { AutoScheduleButton } from "./AutoScheduleButton";
interface RequestShowModalProps {
  request: RequestListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestUpdated?: () => void;
}

export function RequestShowModal({ 
  request, 
  open, 
  onOpenChange,
  onRequestUpdated
}: RequestShowModalProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const authApi = useAuthApi();
  const { triggerJobScheduled } = useLifecycleEmailIntegration();
  const createQuote = useCreateQuote();
  const { updateRequest } = useRequestOperations();
  const { data: customers = [] } = useCustomersData();
  const [showEditModal, setShowEditModal] = useState(false);
  
  const customer = useMemo(() => 
    request ? customers.find(c => c.id === request.customer_id) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [customers, request?.customer_id]
  );

  const statusInfo = useMemo(() => 
    request ? statusOptions.find(s => s.value === request.status) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [request?.status]
  );

  // Action handlers (reused from RequestActions)
  const handleConvertToQuote = () => {
    if (!request) return;
    createQuote.mutate({
      customerId: request.customer_id,
      address: request.property_address,
      status: 'Draft',
      notesInternal: `Created from request: ${request.title}\n\nService Details: ${request.service_details}${request.notes ? `\n\nNotes: ${request.notes}` : ''}`,
      depositRequired: false,
      taxRate: 0,
      discount: 0,
    }, {
      onSuccess: (data) => {
        onOpenChange(false);
        navigate(`/quotes?newQuote=${data.id}`);
      }
    });
  };

  const getPreferredHour = (preferredTimes: string[] = []): number => {
    const firstPreference = preferredTimes[0] || 'Any time';
    switch (firstPreference) {
      case 'Morning (8am - 12pm)': return 9;
      case 'Afternoon (12pm - 5pm)': return 13;
      case 'Evening (5pm - 8pm)': return 17;
      case 'Any time':
      default: return 9;
    }
  };

  const getNextBusinessDay = (): Date => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }
    return tomorrow;
  };

  const calculateAssessmentStartTime = (): string => {
    const preferredHour = getPreferredHour(request.preferred_times as string[]);
    let assessmentDate: Date;
    
    if (request.preferred_assessment_date) {
      assessmentDate = new Date(request.preferred_assessment_date);
    } else {
      assessmentDate = getNextBusinessDay();
    }
    
    assessmentDate.setHours(preferredHour, 0, 0, 0);
    const now = new Date();
    if (assessmentDate <= now) {
      assessmentDate = getNextBusinessDay();
      assessmentDate.setHours(preferredHour, 0, 0, 0);
    }
    
    return assessmentDate.toISOString();
  };

  const handleScheduleAssessment = async () => {
    if (!request) return;
    try {
      const { data: result } = await authApi.invoke('jobs-crud', {
        method: 'POST',
        body: {
          customerId: request.customer_id,
          title: `${request.title} - Assessment`,
          address: request.property_address,
          notes: `Assessment for request: ${request.title}\n\nService Details: ${request.service_details}${request.notes ? `\n\nNotes: ${request.notes}` : ''}`,
          status: 'Scheduled',
          startsAt: calculateAssessmentStartTime(),
          isAssessment: true,
          requestId: request.id,
        },
        toast: {
          success: `Assessment scheduled successfully`,
          loading: 'Scheduling assessment...',
          error: 'Failed to schedule assessment',
          onSuccess: triggerJobScheduled
        }
      });

      if (result) {
        updateRequest.mutate({
          id: request.id,
          status: 'Scheduled'
        });
        onOpenChange(false);
        navigate('/work-orders');
      }
    } catch (error) {
      console.error('Failed to schedule assessment:', error);
    }
  };

  const handleConvertToJob = async () => {
    if (!request) return;
    try {
      const { data: result } = await authApi.invoke('jobs-crud', {
        method: 'POST',
        body: {
          customerId: request.customer_id,
          title: request.title,
          address: request.property_address,
          notes: `Created from request: ${request.title}\n\nService Details: ${request.service_details}${request.notes ? `\n\nNotes: ${request.notes}` : ''}`,
          status: 'Scheduled',
          startsAt: request.preferred_assessment_date,
          photos: request.photos || [],
        },
        toast: {
          success: `Job created from request successfully`,
          loading: 'Converting request to job...',
          error: 'Failed to convert request to job',
          onSuccess: triggerJobScheduled
        }
      });

      if (result) {
        onOpenChange(false);
        navigate('/work-orders');
      }
    } catch (error) {
      console.error('Failed to convert request to job:', error);
    }
  };

  const handleArchive = () => {
    if (!request) return;
    updateRequest.mutate({
      id: request.id,
      status: 'Archived'
    }, {
      onSuccess: () => {
        onOpenChange(false);
      }
    });
  };

  if (!request) return null;

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left">
            <div className="flex items-center justify-between">
              <DrawerTitle className="pr-4">{request.title}</DrawerTitle>
              {statusInfo && (
                <Badge className={statusInfo.color}>
                  {statusInfo.label}
                </Badge>
              )}
            </div>
          </DrawerHeader>
          
          <div className="px-4 pb-4 overflow-y-auto space-y-6">
            {/* Customer Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                {t('requests.show.customerInfo')}
              </div>
              {customer ? (
                <div className="space-y-2 pl-6">
                  <div className="font-medium text-base">{customer.name}</div>
                  <div className="space-y-1">
                    {customer.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{customer.email}</span>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    {customer.address && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{customer.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="pl-6 text-muted-foreground">{t('requests.show.customerInfo')}</div>
              )}
            </div>

            {/* Request Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileText className="h-4 w-4" />
                {t('requests.show.requestInfo')}
              </div>
              <div className="space-y-3 pl-6">
                <div>
                  <div className="text-sm text-muted-foreground">{t('requests.show.propertyAddress')}</div>
                  <div className="font-medium">{request.property_address || '\u00A0'}</div>
                </div>
                
                <div>
                  <div className="text-sm text-muted-foreground">{t('requests.show.serviceDetails')}</div>
                  <div className="mt-1 p-3 bg-muted rounded-md text-sm">
                    {request.service_details}
                  </div>
                </div>
              </div>
            </div>

            {/* Scheduling Information */}
            {(request.preferred_assessment_date || request.alternative_date || request.preferred_times?.length > 0) && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {t('requests.show.schedulingPrefs')}
                </div>
                <div className="space-y-3 pl-6">
                  {request.preferred_assessment_date && (
                    <div>
                      <div className="text-sm text-muted-foreground">{t('requests.show.preferredDate')}</div>
                      <div className="font-medium">
                        {format(new Date(request.preferred_assessment_date), "PPP")}
                      </div>
                    </div>
                  )}
                  
                  {request.alternative_date && (
                    <div>
                      <div className="text-sm text-muted-foreground">{t('requests.show.preferredDate')}</div>
                      <div className="font-medium">{request.alternative_date}</div>
                    </div>
                  )}
                  
                  {request.preferred_times && request.preferred_times.length > 0 && (
                    <div>
                      <div className="text-sm text-muted-foreground">{t('requests.show.preferredTimes')}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {request.preferred_times.map((time) => {
                          // Get translated time labels  
                          const timeMap: Record<string, string> = {
                            'Morning (8am - 12pm)': t('requests.create.times.morning'),
                            'Afternoon (12pm - 5pm)': t('requests.create.times.afternoon'),
                            'Evening (5pm - 8pm)': t('requests.create.times.evening')
                          };
                          return (
                            <Badge key={time} variant="secondary" className="text-xs">
                              {timeMap[time] || time}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Photos */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Camera className="h-4 w-4" />
                {t('requests.show.photos')}
              </div>
              <div className="pl-6">
                {request.photos && request.photos.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {request.photos.map((url: string, idx: number) => (
                      <a key={idx} href={url} target="_blank" rel="noreferrer" className="block">
                        <img
                          src={url}
                          alt={`Request photo ${idx + 1}`}
                          loading="lazy"
                          className="w-full h-20 object-cover rounded-md border"
                        />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">{t('requests.show.noPhotos')}</div>
                )}
              </div>
            </div>

            {/* Internal Notes */}
            {request.notes && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {t('requests.show.internalNotes')}
                </div>
                <div className="pl-6">
                  <div className="p-3 bg-muted rounded-md text-sm">
                    {request.notes}
                  </div>
                </div>
              </div>
            )}

            {/* Request Metadata */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="h-4 w-4" />
                {t('requests.show.metadata')}
              </div>
              <div className="grid grid-cols-2 gap-3 pl-6 text-sm">
                <div>
                  <div className="text-muted-foreground">{t('requests.show.createdAt')}</div>
                  <div>{format(new Date(request.created_at), "PPP 'at' p")}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t('requests.show.status')}</div>
                  <div>{statusInfo?.label || request.status}</div>
                </div>
              </div>
            </div>
          </div>
          
          <DrawerFooter>
            {isMobile ? (
              <div className="flex flex-col gap-2">
                <AutoScheduleButton
                  requestId={request.id}
                  disabled={request.status === 'Archived'}
                  onSuccess={() => onOpenChange(false)}
                />
                <Button
                  variant="outline"
                  onClick={handleScheduleAssessment}
                  disabled={request.status === 'Archived'}
                  className="w-full"
                >
                  {t('requests.actions.scheduleAssessment')}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleConvertToQuote}
                  className="w-full"
                >
                  {t('requests.actions.convertToQuote')}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleConvertToJob}
                  className="w-full"
                >
                  {t('requests.actions.convertToJob')}
                </Button>
                <Button
                  variant="default"
                  onClick={() => setShowEditModal(true)}
                  className="w-full"
                >
                  {t('requests.show.editRequest')}
                </Button>
                <Button
                  variant="default"
                  onClick={handleArchive}
                  disabled={request.status === 'Archived'}
                  className="w-full"
                >
                  {t('requests.actions.archive')}
                </Button>
              </div>
            ) : (
              <div className="flex justify-between">
                <div className="flex gap-2">
                  <AutoScheduleButton
                    requestId={request.id}
                    disabled={request.status === 'Archived'}
                    onSuccess={() => onOpenChange(false)}
                  />
                  <Button
                    variant="outline"
                    onClick={handleScheduleAssessment}
                    disabled={request.status === 'Archived'}
                  >
                    {t('requests.actions.scheduleAssessment')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleConvertToQuote}
                  >
                    {t('requests.actions.convertToQuote')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleConvertToJob}
                  >
                    {t('requests.actions.convertToJob')}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    onClick={() => setShowEditModal(true)}
                  >
                    {t('requests.show.editRequest')}
                  </Button>
                  <Button
                    variant="default"
                    onClick={handleArchive}
                    disabled={request.status === 'Archived'}
                  >
                    {t('requests.actions.archive')}
                  </Button>
                </div>
              </div>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <RequestEditModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        request={request}
        onRequestUpdated={() => {
          if (onRequestUpdated) {
            onRequestUpdated();
          }
        }}
      />
    </>
  );
}