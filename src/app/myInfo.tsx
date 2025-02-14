'use client';
import { CgPluginLib, CommunityInfoResponsePayload, UserInfoResponsePayload } from '@/pluginLib';
import { useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';

const MyInfo = () => {
  const [userInfo, setUserInfo] = useState<UserInfoResponsePayload | null>(null);
  const [communityInfo, setCommunityInfo] = useState<CommunityInfoResponsePayload | null>(null);
  const searchParams = useSearchParams();
  const iframeUid = searchParams.get('iframeUid');

  useEffect(() => {
    const fetchData = async () => {
      const cgPluginLibInstance = await CgPluginLib.initialize(iframeUid || '', '/api/sign');

      cgPluginLibInstance.getUserInfo().then((userInfo) => {
        console.log('userInfo', userInfo);
        setUserInfo(userInfo.data);
      });

      cgPluginLibInstance.getCommunityInfo().then((communityInfo) => {
        console.log('communityInfo', communityInfo);
        setCommunityInfo(communityInfo.data);
      });

      const response = await cgPluginLibInstance.giveRole('admin', 'asdf');
      console.log('response', response);
    }

    fetchData();

    // const testAttemptLimit = async () => {
    //   await cgPluginLibInstance.getUserInfo();
    //   setTimeout(() => {
    //     testAttemptLimit();
    //   }, 20);
    // }

    // testAttemptLimit();
  }, [iframeUid]);

  return (<div className='flex flex-col gap-2'>
    <p className='font-bold'>Your username is: {userInfo?.name}</p>
    <p className='font-bold'>Your community is: {communityInfo?.name}</p>
  </div>);
}

export default MyInfo;