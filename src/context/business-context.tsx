import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '@clerk/clerk-react';
import { sanitizeUserFacingError, toUserFacingError } from '@/lib/user-facing-error';
import type { Business, BusinessFormValues } from '@/types';

interface BusinessContextValue {
  businesses: Business[];
  activeBusiness: Business | null;
  isLoading: boolean;
  error: string | null;
  selectBusiness: (businessId: string) => void;
  refreshBusinesses: () => Promise<void>;
  createBusiness: (values: BusinessFormValues) => Promise<Business>;
  updateBusiness: (businessId: string, values: BusinessFormValues) => Promise<Business>;
}

const BusinessContext = createContext<BusinessContextValue | null>(null);

const activeBusinessStorageKey = 'social-studio.active-business-id';

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBusinessId, setActiveBusinessId] = useState<string | null>(() =>
    localStorage.getItem(activeBusinessStorageKey),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      const token = await getToken();

      if (!token) {
        throw new Error('You must be signed in.');
      }

      const response = await fetch(path, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...init?.headers,
        },
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | T | null;

      if (!response.ok) {
        throw new Error(
          sanitizeUserFacingError(
            (payload as { error?: string } | null)?.error,
            `Request failed (${response.status}).`,
          ),
        );
      }

      return payload as T;
    },
    [getToken],
  );

  const refreshBusinesses = useCallback(async () => {
    if (!isLoaded || !isSignedIn) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await request<{ businesses: Business[] }>('/api/businesses');
      setBusinesses(data.businesses);

      const storedBusinessId = localStorage.getItem(activeBusinessStorageKey);
      const nextActive =
        data.businesses.find((business) => business.id === storedBusinessId) ?? data.businesses[0];

      setActiveBusinessId(nextActive?.id ?? null);

      if (nextActive) {
        localStorage.setItem(activeBusinessStorageKey, nextActive.id);
      } else {
        localStorage.removeItem(activeBusinessStorageKey);
      }
    } catch (requestError) {
      setError(toUserFacingError(requestError, 'Could not load businesses.'));
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, isSignedIn, request]);

  useEffect(() => {
    void refreshBusinesses();
  }, [refreshBusinesses]);

  const selectBusiness = useCallback((businessId: string) => {
    setActiveBusinessId(businessId);
    localStorage.setItem(activeBusinessStorageKey, businessId);
  }, []);

  const createBusiness = useCallback(
    async (values: BusinessFormValues) => {
      const data = await request<{ business: Business }>('/api/businesses', {
        method: 'POST',
        body: JSON.stringify(values),
      });

      setBusinesses((current) => [...current, data.business]);
      selectBusiness(data.business.id);
      return data.business;
    },
    [request, selectBusiness],
  );

  const updateBusiness = useCallback(
    async (businessId: string, values: BusinessFormValues) => {
      const data = await request<{ business: Business }>(`/api/businesses/${businessId}`, {
        method: 'PUT',
        body: JSON.stringify(values),
      });

      setBusinesses((current) =>
        current.map((business) => (business.id === businessId ? data.business : business)),
      );
      return data.business;
    },
    [request],
  );

  const activeBusiness = useMemo(
    () => businesses.find((business) => business.id === activeBusinessId) ?? null,
    [activeBusinessId, businesses],
  );

  const value = useMemo(
    () => ({
      businesses,
      activeBusiness,
      isLoading,
      error,
      selectBusiness,
      refreshBusinesses,
      createBusiness,
      updateBusiness,
    }),
    [
      activeBusiness,
      businesses,
      createBusiness,
      error,
      isLoading,
      refreshBusinesses,
      selectBusiness,
      updateBusiness,
    ],
  );

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusinessContext() {
  const context = useContext(BusinessContext);

  if (!context) {
    throw new Error('useBusinessContext must be used within BusinessProvider');
  }

  return context;
}
