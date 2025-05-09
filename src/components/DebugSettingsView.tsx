/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState } from 'react';
import { useCgLib } from '@/context/CgLibContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, Terminal } from 'lucide-react';
// import type { UserFriendsResponsePayload } from '@common-ground-dao/cg-plugin-lib-host'; // Removed unused import

interface KeyValuePairs {
  [key: string]: any;
}

const DataDisplayCard: React.FC<{
  title: string;
  data: any; 
  isLoading: boolean;
  error: string | null;
}> = ({ title, data, isLoading, error }) => {
  let content;
  if (isLoading) {
    content = <div className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</div>;
  } else if (error) {
    content = <div className="flex items-center text-destructive"><AlertCircle className="mr-2 h-4 w-4" />Error: {error}</div>;
  } else if (data) {
    content = <pre className="text-sm bg-muted p-4 rounded-md overflow-auto whitespace-pre-wrap break-all">{JSON.stringify(data, null, 2)}</pre>;
  } else {
    content = <p className="text-sm text-muted-foreground">No data available.</p>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
};

const getErrorMessage = (error: unknown): string => {
  if (!error) return 'Unknown error';
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Could not stringify error object';
  }
};

export const DebugSettingsView: React.FC = () => {
  const { cgInstance, isInitializing, initError: cgError } = useCgLib();
  const [allData, setAllData] = useState<KeyValuePairs>({});
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [dataFetchError, setDataFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (isInitializing || !cgInstance) {
      return;
    }

    const fetchData = async () => {
      setIsLoadingData(true);
      setDataFetchError(null);
      const fetched: KeyValuePairs = {};

      try {
        // File-level disable covers this (cgInstance as any)
        const userInfoResponse = await (cgInstance as any).getUserInfo();
        fetched.userInfo = userInfoResponse?.data ?? { error: getErrorMessage(userInfoResponse?.error) || 'Failed to fetch user info' };
      } catch (e) {
        fetched.userInfo = { error: `Failed to retrieve user info: ${getErrorMessage(e)}` };
      }
      
      try {
        // File-level disable covers this
        const communityInfoResponse = await (cgInstance as any).getCommunityInfo();
        fetched.communityInfo = communityInfoResponse?.data ?? { error: getErrorMessage(communityInfoResponse?.error) || 'Failed to fetch community info' };
      } catch (e) {
        fetched.communityInfo = { error: `Failed to retrieve community info: ${getErrorMessage(e)}` };
      }

      if (cgInstance && typeof (cgInstance as any).getUserFriends === 'function') {
        try {
          // File-level disable covers this
          const friendsResponse = await (cgInstance as any).getUserFriends(10, 0);
          fetched.userFriends = friendsResponse?.data ?? { error: getErrorMessage(friendsResponse?.error) || 'Failed to fetch user friends' };
        } catch (e) {
          fetched.userFriends = { error: `Failed to retrieve user friends: ${getErrorMessage(e)}` };
        }
      } else {
        fetched.userFriends = { info: 'getUserFriends method not available or not a function on cgInstance' };
      }
      
      // Fetch Plugin Context Data
      if (typeof (cgInstance as any).getContextData === 'function') {
        try {
          const pluginContextData = await (cgInstance as any).getContextData(); // Assuming getContextData might be async or sync
          // If it's synchronous: const pluginContextData = (cgInstance as any).getContextData();
          fetched.pluginContext = pluginContextData ?? { error: 'getContextData returned null or undefined' };
        } catch (e) {
          fetched.pluginContext = { error: `Failed to retrieve plugin context data: ${getErrorMessage(e)}` };
        }
      } else {
        fetched.pluginContext = { info: 'getContextData method not available on cgInstance' };
      }
      
      setAllData(fetched);
      setIsLoadingData(false);
    };

    fetchData().catch(err => {
      console.error("Critical error in fetchData logic:", err);
      setDataFetchError(getErrorMessage(err));
      setIsLoadingData(false);
    });

  }, [cgInstance, isInitializing]);

  if (isInitializing) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Initializing CG Lib...</div>;
  }

  if (cgError) {
    return (
      <div className="p-4 text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
        <p className="font-semibold flex items-center"><AlertCircle className="mr-2 h-5 w-5" />Error initializing CG Lib:</p>
        <pre className="mt-2 text-sm whitespace-pre-wrap break-all">{getErrorMessage(cgError)}</pre>
      </div>
    );
  }
  
  if (!cgInstance) {
     return (
      <div className="p-4 text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
        <p className="font-semibold flex items-center"><AlertCircle className="mr-2 h-5 w-5" />CG Lib instance not available.</p>
      </div>
    );
  }

  const displayEntries = Object.entries(allData).map(([key, value]) => {
    if (value && typeof value.error === 'string') { 
      return { key, error: value.error, data: null };
    }
    if (value && typeof value.info === 'string') { // Handle info messages like method not available
      return { key, error: value.info, data: null }; // Display info as an error for simplicity in this card
    }
    return { key, data: value, error: null };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-5 duration-500">
        <Terminal className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Debug Settings</h1>
      </div>
      <p className="text-muted-foreground animate-in fade-in slide-in-from-bottom-5 duration-500 delay-100">
        This page displays data retrieved from the Common Ground Plugin Library instance.
      </p>

      {(isLoadingData && Object.keys(allData).length === 0 && !dataFetchError) && (
         <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading data...</div>
      )}

      {dataFetchError && (
          <DataDisplayCard title="Overall Data Fetch Error" data={null} isLoading={false} error={dataFetchError} />
      )}

      {displayEntries.map(({ key, data, error }) => (
        <DataDisplayCard 
            key={key} 
            title={key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())} 
            data={data} 
            isLoading={isLoadingData && !data && !error} 
            error={error}
        />
      ))}
      
       {(!isLoadingData && Object.keys(allData).length === 0 && !dataFetchError && !cgError && !isInitializing) && (
        <Card>
          <CardHeader><CardTitle>No Data Retrieved</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground">No specific data points were fetched or all attempts resulted in errors not captured above. Check console for details.</p></CardContent>
        </Card>
      )}
    </div>
  );
}; 