'use client';
import { CgPluginLib, CommunityInfoResponsePayload, UserInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import { useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';

const publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzFK+zMlVkCyuE0Jglpp4
BXTXFZN/yNuXdSUosiR0uLTJq9G04Nzpf1Y9OHEJJzPotxqYIGrq/8sS/WspaSDH
H1/OkTNoZXCOzQ/dNJykHF4ICP7YrH3FHKHWnL+nnGh2MpLkxiN4NrfXDsr+rwii
OmWn/OM2nTOBBmg5n1EkjQaEQ1F3+19N4JAjcNhgsdK0+UF8fK3spjYpY9rrA9Vj
7bea2M0OOvgQ/xyXnm+pY8132o5NOC9A0ThCkw7d7xC09Krwo8GaEiDXch3TwJol
THDPhiV2FXbZhy7M1pVwE/ah/qVY2kMy5sqMIoDxFQ4LtJKpKvwF4p4+rQQPNfC2
EQIDAQAB
-----END PUBLIC KEY-----`;

const MyInfo = () => {
  const [userInfo, setUserInfo] = useState<UserInfoResponsePayload | null>(null);
  const [communityInfo, setCommunityInfo] = useState<CommunityInfoResponsePayload | null>(null);
  const searchParams = useSearchParams();
  const iframeUid = searchParams.get('iframeUid');

  useEffect(() => {
    const fetchData = async () => {
      const cgPluginLibInstance = await CgPluginLib.initialize(iframeUid || '', '/api/sign', publicKey);
      cgPluginLibInstance.getUserInfo().then((userInfo) => {
        console.log('userInfo', userInfo);
        setUserInfo(userInfo.data);
      });

      cgPluginLibInstance.getCommunityInfo().then((communityInfo) => {
        console.log('communityInfo', communityInfo);
        setCommunityInfo(communityInfo.data);
      });

      // const response = await cgPluginLibInstance.giveRole('admin', 'asdf');
      // console.log('response', response);
    }

    fetchData();
  }, [iframeUid]);

  return (<div className='flex flex-col gap-2'>
    <p className='font-bold'>Your username is: {userInfo?.name}</p>
    <p className='font-bold'>Your community is: {communityInfo?.title}</p>
  </div>);
}

export default MyInfo;