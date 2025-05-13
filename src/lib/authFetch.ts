import { useAuth } from '../context/AuthContext';
import { useCallback } from 'react';

// Define a custom HttpError class
export class HttpError extends Error {
  status: number;
  statusText: string;
  body: unknown; // Can be parsed JSON object or raw text

  constructor(status: number, statusText: string, body: unknown, message?: string) {
    super(message || `HTTP error ${status} ${statusText}`);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

// Define a generic type for fetch options
interface AuthFetchOptions extends RequestInit {
    parseJson?: boolean; // New option to control JSON parsing
}

// Define the hook return type
interface UseAuthFetchReturn {
    authFetch: <T = unknown>(
        url: string, 
        options?: AuthFetchOptions
    ) => Promise<T extends Response ? Response : T>; // Adjusted return type
}

/**
 * Hook that provides an authenticated fetch function.
 * Automatically adds the JWT Bearer token to requests.
 * Handles basic response checking and JSON parsing.
 */
export function useAuthFetch(): UseAuthFetchReturn {
    const authContext = useAuth();

    const authFetch = useCallback(async <T = unknown>(
        url: string, 
        options: AuthFetchOptions = {}
    ): Promise<T extends Response ? Response : T> => {
        const { jwt, logout } = authContext;
        const { parseJson = true, ...fetchOptions } = options; // Default parseJson to true

        if (!jwt) {
            // This shouldn't happen if auth flow is correct, but good safeguard
            console.error('authFetch called without JWT token.');
            // Optionally trigger logout or throw specific error
            logout(); // Clear any potentially invalid state
            throw new Error('Not authenticated');
        }

        const headers = new Headers(fetchOptions.headers || {});
        headers.set('Authorization', `Bearer ${jwt}`);
        // Ensure Content-Type is set for POST/PUT etc. if body exists
        if (fetchOptions.body && !headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }

        const response = await fetch(url, {
            ...fetchOptions,
            headers,
        });

        if (response.status === 401) {
            // JWT might be expired or invalid
            console.error('Authentication error (401) on fetch, logging out.');
            logout(); // Clear the potentially invalid token
            throw new Error('Authentication failed');
        }

        if (!response.ok) {
            // Handle other HTTP errors
            let errorBody: unknown;
            try {
                // Clone the response before reading the body, so it can be potentially read again if needed,
                // though for throwing an error it might not be strictly necessary.
                errorBody = await response.clone().json();
            } catch (e) {
                // If JSON parsing fails, try to get the raw text body
                try {
                    errorBody = await response.text();
                } catch (textError) {
                    // If even text parsing fails, use a generic message
                    errorBody = 'Could not retrieve error body';
                }
            }
            // Log the detailed error
            console.error(`HTTP error! status: ${response.status} ${response.statusText}, body:`, errorBody);
            throw new HttpError(response.status, response.statusText, errorBody);
        }

        if (!parseJson) {
            // If parseJson is false, return the raw Response object
            // The generic T is constrained to Response in this path by the return type conditional
            return response as T extends Response ? Response : T;
        }

        // Handle cases with no content (e.g., 204 No Content for DELETE)
        if (response.status === 204) {
            return undefined as T extends Response ? Response : T; // Or null, depending on expected return type
        }

        // Attempt to parse JSON, handle potential errors
        try {
            const data = await response.json();
            return data as T extends Response ? Response : T;
        } catch (error) {
            console.error('Failed to parse JSON response:', error);
            throw new Error('Invalid JSON response from server');
        }
    }, [authContext]);

    return { authFetch };
} 