'use client';
import { CgPluginLib, CommunityInfoResponsePayload, UserInfoResponsePayload } from '@/pluginLib';
import { useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';

const MyInfo = () => {
  const [userInfo, setUserInfo] = useState<UserInfoResponsePayload | null>(null);
  const [communityInfo, setCommunityInfo] = useState<CommunityInfoResponsePayload | null>(null);
  const searchParams = useSearchParams();
  const iframeUid = searchParams.get('iframeUid');
  const cgPluginLibInstance = useMemo(() => new CgPluginLib(iframeUid || '', '/api/signAction'), [iframeUid]);

  useEffect(() => {
    const fetchData = async () => {
      cgPluginLibInstance.getUserInfo().then((userInfo) => {
        console.log('userInfo', userInfo);
        setUserInfo(userInfo);
      });

      cgPluginLibInstance.getCommunityInfo().then((communityInfo) => {
        console.log('communityInfo', communityInfo);
        setCommunityInfo(communityInfo);
      });
    }

    fetchData();

    const signAction = async () => {
      const response = await cgPluginLibInstance.giveRole('admin', 'asdf');
      console.log('response', response);
    };

    signAction();

    // const testAttemptLimit = async () => {
    //   await cgPluginLibInstance.getUserInfo();
    //   setTimeout(() => {
    //     testAttemptLimit();
    //   }, 20);
    // }

    // testAttemptLimit();
  }, [cgPluginLibInstance, iframeUid]);

  return (<div className='flex flex-col gap-2'>
    <p className='font-bold'>Your username is: {userInfo?.name}</p>
    <p className='font-bold'>Your community is: {communityInfo?.name}</p>
  </div>);
}

export default MyInfo;