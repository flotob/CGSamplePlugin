export const MAX_REQUESTS_PER_MINUTE = 100;

export type SafeRequest = {
    request: string; // JSON stringified SafeRequestInner
}

export type SafeRequestInner = {
    type: 'safeRequest';
    iframeUid: string;
    requestId: string;
    data: {
        type: 'init';
    }
}

export type InitResponse = {
    pluginId: string;
    userId: string;
    communityId: string;
}

export type SafeRequestResponse = InitResponse;

export type PluginContextData = {
    pluginId: string;
    userId: string;
    communityId: string;
}

export type CGPluginResponse<T extends object> = {
    data: T;
    __rawResponse: string;
}

export type PluginRequest = {
    request: string; // JSON stringified RequestInner
    signature: string;
}

export type PluginResponse = {
    response: string; // JSON stringified AnyResponsePayload or SafeRequestResponse
    signature?: string;
}

export type PluginRequestInner = {
    pluginId: string;
    requestId: string;
    iframeUid: string;
} & ({
    type: 'action';
    data: ActionPayload;
} | {
    type: 'request';
    data: RequestPayload;
})

export type RequestPayload = UserInfoRequestPayload | CommunityInfoRequestPayload;
export type ActionPayload = GiveRoleActionPayload;

export type UserInfoRequestPayload = {
    type: 'userInfo';
}

export type CommunityInfoRequestPayload = {
    type: 'communityInfo';
    communityId: string;
}

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
