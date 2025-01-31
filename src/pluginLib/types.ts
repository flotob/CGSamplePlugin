export type RequestType = 'userInfo' | 'communityInfo';

export interface RequestPayload {
    requestId: string;
}

export interface UserInfoResponse {
    requestId: string;
    data: {
        id: string;
        name: string;
        email: string;
    };
}

export interface CommunityInfoResponse {
    requestId: string;
    data: {
        id: string;
        name: string;
    };
}

export type AnyResponse = UserInfoResponse | CommunityInfoResponse;
