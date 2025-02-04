export type RequestType = 'userInfo' | 'communityInfo';

export const MAX_REQUESTS_PER_MINUTE = 100;

export interface RequestPayload {
    requestId: string;
    iframeUid: string;
}

export interface UserInfoResponsePayload {
    id: string;
    name: string;
    email: string;
}

export interface CommunityInfoResponsePayload {
    id: string;
    name: string;
}

export type AnyResponsePayload = UserInfoResponsePayload | CommunityInfoResponsePayload;
