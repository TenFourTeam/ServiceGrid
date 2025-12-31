import { useQuery } from "@tanstack/react-query";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useCustomersData } from "@/hooks/useCustomersData";
import { useRequestsData } from "@/hooks/useRequestsData";
import { useMemo } from "react";

export interface LeadSourceStats {
  source: string;
  count: number;
  qualified: number;
  conversionRate: number;
}

export interface LeadScoreDistribution {
  range: string;
  count: number;
  label: string;
}

export interface LeadFunnelData {
  stage: string;
  count: number;
  percentage: number;
}

export interface LeadAnalyticsData {
  totalLeads: number;
  qualifiedLeads: number;
  unqualifiedLeads: number;
  averageLeadScore: number;
  qualificationRate: number;
  leadsBySource: LeadSourceStats[];
  scoreDistribution: LeadScoreDistribution[];
  funnelData: LeadFunnelData[];
  recentLeads: number; // Last 7 days
  unassignedRequests: number;
  topSource: string | null;
}

interface UseLeadAnalyticsOptions {
  dateRange?: { start: Date; end: Date };
}

export function useLeadAnalytics(options?: UseLeadAnalyticsOptions) {
  const { businessId } = useBusinessContext();
  const { data: customers = [], isLoading: customersLoading } = useCustomersData();
  const { data: requestsResponse, isLoading: requestsLoading } = useRequestsData();
  
  const requests = requestsResponse?.data || [];
  
  const analytics = useMemo<LeadAnalyticsData | null>(() => {
    if (!customers.length && !requests.length) return null;
    
    // Filter by date range if provided
    let filteredCustomers = customers;
    if (options?.dateRange) {
      const { start, end } = options.dateRange;
      filteredCustomers = customers.filter(c => {
        const createdAt = c.created_at ? new Date(c.created_at) : null;
        return createdAt && createdAt >= start && createdAt <= end;
      });
    }
    
    // Basic counts
    const totalLeads = filteredCustomers.length;
    const qualifiedLeads = filteredCustomers.filter(c => c.is_qualified).length;
    const unqualifiedLeads = totalLeads - qualifiedLeads;
    
    // Average lead score
    const scoresArray = filteredCustomers
      .map(c => c.lead_score ?? 0)
      .filter(score => score > 0);
    const averageLeadScore = scoresArray.length > 0 
      ? Math.round(scoresArray.reduce((a, b) => a + b, 0) / scoresArray.length)
      : 0;
    
    // Qualification rate
    const qualificationRate = totalLeads > 0 
      ? Math.round((qualifiedLeads / totalLeads) * 100)
      : 0;
    
    // Leads by source
    const sourceMap = new Map<string, { total: number; qualified: number }>();
    filteredCustomers.forEach(c => {
      const source = c.lead_source || 'Unknown';
      const current = sourceMap.get(source) || { total: 0, qualified: 0 };
      current.total += 1;
      if (c.is_qualified) current.qualified += 1;
      sourceMap.set(source, current);
    });
    
    const leadsBySource: LeadSourceStats[] = Array.from(sourceMap.entries())
      .map(([source, data]) => ({
        source,
        count: data.total,
        qualified: data.qualified,
        conversionRate: data.total > 0 
          ? Math.round((data.qualified / data.total) * 100)
          : 0
      }))
      .sort((a, b) => b.count - a.count);
    
    // Score distribution
    const scoreRanges = [
      { range: '0-19', label: 'Cold', min: 0, max: 19 },
      { range: '20-39', label: 'Cool', min: 20, max: 39 },
      { range: '40-59', label: 'Warm', min: 40, max: 59 },
      { range: '60-79', label: 'Hot', min: 60, max: 79 },
      { range: '80-100', label: 'Very Hot', min: 80, max: 100 },
    ];
    
    const scoreDistribution: LeadScoreDistribution[] = scoreRanges.map(({ range, label, min, max }) => ({
      range,
      label,
      count: filteredCustomers.filter(c => {
        const score = c.lead_score ?? 0;
        return score >= min && score <= max;
      }).length
    }));
    
    // Funnel data - track progression through lead stages
    const requestsForCustomers = requests.filter(r => 
      filteredCustomers.some(c => c.id === r.customer_id)
    );
    
    const scheduledCustomers = new Set(
      requestsForCustomers
        .filter(r => r.status === 'Scheduled' || r.status === 'Assessed')
        .map(r => r.customer_id)
    );
    
    const assessedCustomers = new Set(
      requestsForCustomers
        .filter(r => r.status === 'Assessed')
        .map(r => r.customer_id)
    );
    
    const funnelData: LeadFunnelData[] = [
      { stage: 'New Leads', count: totalLeads, percentage: 100 },
      { stage: 'Qualified', count: qualifiedLeads, percentage: totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0 },
      { stage: 'Scheduled', count: scheduledCustomers.size, percentage: totalLeads > 0 ? Math.round((scheduledCustomers.size / totalLeads) * 100) : 0 },
      { stage: 'Assessed', count: assessedCustomers.size, percentage: totalLeads > 0 ? Math.round((assessedCustomers.size / totalLeads) * 100) : 0 },
    ];
    
    // Recent leads (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentLeads = customers.filter(c => {
      const createdAt = c.created_at ? new Date(c.created_at) : null;
      return createdAt && createdAt >= sevenDaysAgo;
    }).length;
    
    // Unassigned requests
    const unassignedRequests = requests.filter(r => 
      !r.assigned_to && r.status !== 'Archived'
    ).length;
    
    // Top source
    const topSource = leadsBySource.length > 0 && leadsBySource[0].source !== 'Unknown'
      ? leadsBySource[0].source
      : leadsBySource.length > 1 ? leadsBySource[1]?.source : null;
    
    return {
      totalLeads,
      qualifiedLeads,
      unqualifiedLeads,
      averageLeadScore,
      qualificationRate,
      leadsBySource,
      scoreDistribution,
      funnelData,
      recentLeads,
      unassignedRequests,
      topSource,
    };
  }, [customers, requests, options?.dateRange]);
  
  return {
    data: analytics,
    isLoading: customersLoading || requestsLoading,
  };
}
