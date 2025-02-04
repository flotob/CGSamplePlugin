export type RequestType = 'userInfo' | 'communityInfo';

export interface RequestPayload {
    requestId: string;
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
