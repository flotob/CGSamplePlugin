export type RequestType = 'userInfo' | 'communityInfo' | 'action';

export const MAX_REQUESTS_PER_MINUTE = 100;

export type PluginRequest = {
    type: RequestType;
    payload: RequestPayload;
}

export type RequestPayload = {
    type: 'basic';
    requestId: string;
    iframeUid: string;
} | {
    type: 'action';
    requestId: string;
    iframeUid: string;
    payload: ActionRequestPayload;
    signature: string;
}

export type GiveRoleActionPayload = {
    type: 'giveRole';
    roleId: string;
    userId: string;
}

export type ActionRequestPayload = GiveRoleActionPayload;

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
