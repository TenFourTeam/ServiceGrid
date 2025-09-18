import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Mail, Phone, MapPin, Calendar, Clock, FileText, User, Camera } from "lucide-react";
import { format } from "date-fns";
import { RequestListItem } from "@/hooks/useRequestsData";
import { useCustomersData } from "@/hooks/useCustomersData";
import { statusOptions } from "@/validation/requests";
import { RequestBottomModal } from "./RequestBottomModal";
import { useLanguage } from "@/contexts/LanguageContext";
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
  const { data: customers = [] } = useCustomersData();
  const [showEditModal, setShowEditModal] = useState(false);
  
  const customer = useMemo(() => 
    request ? customers.find(c => c.id === request.customer_id) : null,
    [customers, request?.customer_id]
  );

  const statusInfo = useMemo(() => 
    request ? statusOptions.find(s => s.value === request.status) : null,
    [request?.status]
  );

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
                {request.property_address && (
                  <div>
                    <div className="text-sm text-muted-foreground">{t('requests.show.propertyAddress')}</div>
                    <div className="font-medium">{request.property_address}</div>
                  </div>
                )}
                
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
            <Button
              onClick={() => setShowEditModal(true)}
              className="w-full"
            >
              {t('requests.show.editRequest')}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Edit Modal - Note: This would need to be a separate edit modal component */}
      {/* For now, we'll use the RequestBottomModal in a future iteration */}
    </>
  );
}