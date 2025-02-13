export type RequestType = 'request' | 'action';

export const MAX_REQUESTS_PER_MINUTE = 100;

export type PluginRequest = {
    type: 'request';
    requestId: string;
    iframeUid: string;
    payload: RequestPayload;
    signature: string;
} | {
    type: 'action';
    requestId: string;
    iframeUid: string;
    payload: ActionPayload;
    signature: string;
}

export type RequestPayload = UserInfoRequestPayload | CommunityInfoRequestPayload;

export type UserInfoRequestPayload = {
    type: 'userInfo';
}

export type CommunityInfoRequestPayload = {
    type: 'communityInfo';
}

export type ActionPayload = GiveRoleActionPayload;

export type GiveRoleActionPayload = {
    type: 'giveRole';
    roleId: string;
    userId: string;
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

export interface ActionResponsePayload {
    success: boolean;
}

export type AnyResponsePayload = UserInfoResponsePayload | CommunityInfoResponsePayload | ActionResponsePayload;
